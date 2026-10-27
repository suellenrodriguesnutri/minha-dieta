// O app pergunta aqui, ao abrir, se o acesso deste celular continua valendo.
const L = require('./_lib');

module.exports = L.rota(['GET', 'POST'], async (req, res) => {
  const tk = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const d = L.lerToken(tk);
  if (!d) return L.responder(res, 401, { motivo: 'invalido' });
  const u = await L.getJ('usuario:' + d.e);
  if (!u) return L.responder(res, 401, { motivo: 'invalido' });
  const compra = await L.getJ('compra:' + d.e);
  if (!compra || compra.status !== 'ativo') return L.responder(res, 401, { motivo: 'sem_acesso' });
  if (u.sid !== d.s) return L.responder(res, 401, { motivo: 'outro_aparelho' });
  L.responder(res, 200, { ok: true, email: d.e });
});
