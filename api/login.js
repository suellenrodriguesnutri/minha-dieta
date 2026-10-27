// Entrar com e-mail e senha. Cada login novo desconecta o celular anterior.
const L = require('./_lib');

module.exports = L.rota(['POST'], async (req, res) => {
  const b = L.corpo(req);
  const email = L.normEmail(b.email), senha = String(b.senha || '');
  if (!L.emailOk(email) || !senha) return L.responder(res, 400, { erro: 'Informe e-mail e senha.' });
  if (await L.muitasTentativas(email)) {
    return L.responder(res, 429, { erro: 'Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.' });
  }
  const u = await L.getJ('usuario:' + email);
  if (!u) {
    const compra = await L.getJ('compra:' + email);
    return L.responder(res, 401, { erro: compra && compra.status === 'ativo'
      ? 'Você ainda não criou sua senha. Toque em "Primeiro acesso".'
      : 'E-mail ou senha incorretos.' });
  }
  if (!L.senhaConfere(senha, u.sal, u.hash)) {
    await L.registrarErro(email);
    return L.responder(res, 401, { erro: 'E-mail ou senha incorretos.' });
  }
  const compra = await L.getJ('compra:' + email);
  if (!compra || compra.status !== 'ativo') {
    return L.responder(res, 403, { erro: 'Seu acesso não está ativo. Fale com a Nutricionista Suellen no Instagram @suellenrodrigues.nutri.' });
  }
  const token = await L.novaSessao(email, u);
  L.responder(res, 200, { ok: true, token, email });
});
