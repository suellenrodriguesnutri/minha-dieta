// Webhook do Hotmart: o Hotmart avisa aqui quando uma compra é aprovada ou reembolsada.
// Configurar no Hotmart com a URL: https://SEU-APP.vercel.app/api/hotmart
// Variáveis no Vercel: HOTMART_HOTTOK (obrigatória) e HOTMART_PRODUCT_ID (opcional, um ou mais IDs separados por vírgula).
const crypto = require('crypto');
const L = require('./_lib');

const LIBERA = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'APPROVED', 'COMPLETED', 'COMPLETE'];
const CORTA = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'REFUNDED', 'CHARGEBACK', 'CANCELED', 'CANCELLED'];

function igual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = L.rota(['POST'], async (req, res) => {
  const b = L.corpo(req);
  const hottok = req.headers['x-hotmart-hottok'] || b.hottok;
  if (!process.env.HOTMART_HOTTOK) return L.responder(res, 500, { erro: 'HOTMART_HOTTOK não configurado.' });
  if (!igual(hottok, process.env.HOTMART_HOTTOK)) return L.responder(res, 401, { erro: 'hottok inválido' });

  // Formato novo (2.0) e formato antigo (1.0) do Hotmart.
  const d = b.data || {};
  const evento = String(b.event || b.status || '').toUpperCase();
  const email = L.normEmail((d.buyer && d.buyer.email) || b.email);
  const transacao = String((d.purchase && d.purchase.transaction) || b.transaction || '');
  const produto = String((d.product && d.product.id) || b.prod || '');

  const filtro = String(process.env.HOTMART_PRODUCT_ID || '').split(',').map(s => s.trim()).filter(Boolean);
  if (filtro.length && !filtro.includes(produto)) return L.responder(res, 200, { ok: true, ignorado: 'outro produto' });
  if (!L.emailOk(email)) return L.responder(res, 200, { ok: true, ignorado: 'sem e-mail' });

  const chave = 'compra:' + email;
  const atual = await L.getJ(chave);
  const agora = new Date().toISOString();

  if (LIBERA.includes(evento)) {
    await L.setJ(chave, { status: 'ativo', transacao, produto, origem: 'hotmart', atualizado: agora });
    return L.responder(res, 200, { ok: true, acao: 'liberado' });
  }
  if (CORTA.includes(evento)) {
    // Só corta se for a mesma compra que liberou o acesso (evita que um boleto cancelado tire o acesso de quem já pagou outra vez).
    if (atual && (!atual.transacao || !transacao || atual.transacao === transacao)) {
      await L.setJ(chave, { ...atual, status: 'bloqueado', motivo: evento, atualizado: agora });
      return L.responder(res, 200, { ok: true, acao: 'bloqueado' });
    }
    return L.responder(res, 200, { ok: true, ignorado: 'outra transação' });
  }
  L.responder(res, 200, { ok: true, ignorado: evento || 'sem evento' });
});
