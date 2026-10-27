// Painel da nutricionista: liberar, bloquear e listar acessos; apagar a senha de quem esqueceu.
// Protegido pela variável ADMIN_SENHA configurada no Vercel.
const crypto = require('crypto');
const L = require('./_lib');

function senhaAdminOk(s) {
  const certa = process.env.ADMIN_SENHA || '';
  const a = crypto.createHash('sha256').update(String(s || '')).digest();
  const c = crypto.createHash('sha256').update(certa).digest();
  return certa.length >= 8 && crypto.timingSafeEqual(a, c);
}

async function chaves(prefixo) {
  let cursor = '0', todas = [];
  do {
    const [prox, lote] = await L.db('SCAN', cursor, 'MATCH', prefixo + '*', 'COUNT', 500);
    cursor = prox; todas = todas.concat(lote);
  } while (cursor !== '0');
  return todas;
}

module.exports = L.rota(['POST'], async (req, res) => {
  const b = L.corpo(req);
  if (!process.env.ADMIN_SENHA || process.env.ADMIN_SENHA.length < 8) {
    return L.responder(res, 500, { erro: 'Configure a variável ADMIN_SENHA no Vercel (mínimo 8 caracteres).' });
  }
  if (await L.muitasTentativas('__admin')) return L.responder(res, 429, { erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  if (!senhaAdminOk(b.senha)) { await L.registrarErro('__admin'); return L.responder(res, 401, { erro: 'Senha do painel incorreta.' }); }

  const email = L.normEmail(b.email), agora = new Date().toISOString();
  switch (b.acao) {
    case 'listar': {
      const lista = [];
      for (const k of await chaves('compra:')) {
        const e = k.slice(7), c = await L.getJ(k), u = await L.getJ('usuario:' + e);
        lista.push({ email: e, status: c && c.status, origem: c && c.origem, atualizado: c && c.atualizado, temSenha: !!u, ultimoLogin: u && u.ultimoLogin });
      }
      lista.sort((a, z) => String(z.atualizado).localeCompare(String(a.atualizado)));
      return L.responder(res, 200, { ok: true, lista });
    }
    case 'liberar': {
      if (!L.emailOk(email)) return L.responder(res, 400, { erro: 'E-mail inválido.' });
      const atual = await L.getJ('compra:' + email) || {};
      await L.setJ('compra:' + email, { ...atual, status: 'ativo', origem: atual.origem || 'manual', atualizado: agora });
      return L.responder(res, 200, { ok: true });
    }
    case 'bloquear': {
      const atual = await L.getJ('compra:' + email);
      if (!atual) return L.responder(res, 404, { erro: 'E-mail não encontrado.' });
      await L.setJ('compra:' + email, { ...atual, status: 'bloqueado', motivo: 'manual', atualizado: agora });
      return L.responder(res, 200, { ok: true });
    }
    case 'apagar_senha': {
      await L.db('DEL', 'usuario:' + email);
      await L.db('DEL', 'erros:' + email);
      return L.responder(res, 200, { ok: true });
    }
    default:
      return L.responder(res, 400, { erro: 'Ação desconhecida.' });
  }
});
