// Primeiro acesso: a compradora informa o e-mail da compra no Hotmart e cria a senha.
const L = require('./_lib');

module.exports = L.rota(['POST'], async (req, res) => {
  const b = L.corpo(req);
  const email = L.normEmail(b.email), senha = String(b.senha || '');
  if (!L.emailOk(email)) return L.responder(res, 400, { erro: 'Informe um e-mail válido.' });
  if (senha.length < 6 || senha.length > 100) return L.responder(res, 400, { erro: 'A senha precisa ter pelo menos 6 caracteres.' });

  const compra = await L.getJ('compra:' + email);
  if (!compra || compra.status !== 'ativo') {
    return L.responder(res, 403, { erro: 'Não encontramos uma compra com este e-mail. Use o mesmo e-mail da compra no Hotmart. Se você acabou de comprar, aguarde alguns minutos e tente de novo.' });
  }
  if (await L.getJ('usuario:' + email)) {
    return L.responder(res, 409, { erro: 'Este e-mail já tem senha criada. Use a opção Entrar.' });
  }
  const token = await L.novaSessao(email, { ...L.hashSenha(senha), criadoEm: new Date().toISOString() });
  L.responder(res, 200, { ok: true, token, email });
});
