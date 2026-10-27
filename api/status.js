// Mostra se a configuração do Vercel está completa (sem revelar nenhum segredo).
const L = require('./_lib');

module.exports = L.rota(['GET'], async (req, res) => {
  let banco = false;
  try { banco = (await L.db('PING')) === 'PONG'; } catch (e) { banco = false; }
  L.responder(res, 200, {
    banco_de_dados: banco ? 'ok' : 'falta configurar',
    hotmart_hottok: process.env.HOTMART_HOTTOK ? 'ok' : 'falta configurar',
    senha_do_painel: (process.env.ADMIN_SENHA || '').length >= 8 ? 'ok' : 'falta configurar',
    filtro_de_produto: process.env.HOTMART_PRODUCT_ID ? 'ok' : 'não configurado (opcional)',
  });
});
