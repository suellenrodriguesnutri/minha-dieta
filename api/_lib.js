// Funções compartilhadas pelo login do Minha Dieta.
// Arquivos que começam com "_" dentro de /api não viram endereços públicos no Vercel.
const crypto = require('crypto');

// Banco de dados: Upstash Redis (adicionado pela aba Storage do Vercel).
// Aceita os nomes padrão e também nomes com prefixo (ex.: MEUBANCO_KV_REST_API_URL).
const envFim = fim => { const k = Object.keys(process.env).find(n => n.endsWith(fim)); return k ? process.env[k] : undefined; };
const URL_DB = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || envFim('KV_REST_API_URL') || envFim('REDIS_REST_URL');
const TOKEN_DB = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || envFim('KV_REST_API_TOKEN') || envFim('REDIS_REST_TOKEN');
// Chave para assinar as sessões. Se não houver AUTH_SECRET, usa o token do banco.
const SEGREDO = process.env.AUTH_SECRET || TOKEN_DB || '';

async function db(...cmd) {
  if (!URL_DB || !TOKEN_DB) throw new Error('BANCO_NAO_CONFIGURADO');
  const r = await fetch(URL_DB, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN_DB, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd.map(String)),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const getJ = async k => { const v = await db('GET', k); return v ? JSON.parse(v) : null; };
const setJ = (k, v) => db('SET', k, JSON.stringify(v));

const normEmail = e => String(e || '').trim().toLowerCase();
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

function hashSenha(senha, sal) {
  sal = sal || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), sal, 64).toString('hex');
  return { sal, hash };
}
function senhaConfere(senha, sal, hash) {
  const h = crypto.scryptSync(String(senha), sal, 64);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === h.length && crypto.timingSafeEqual(h, esperado);
}

const b64 = s => Buffer.from(s).toString('base64url');
function assinar(dados) {
  const corpo = b64(JSON.stringify(dados));
  const sig = crypto.createHmac('sha256', SEGREDO).update(corpo).digest('base64url');
  return corpo + '.' + sig;
}
function lerToken(tk) {
  const [corpo, sig] = String(tk || '').split('.');
  if (!corpo || !sig || !SEGREDO) return null;
  const certo = crypto.createHmac('sha256', SEGREDO).update(corpo).digest('base64url');
  if (sig.length !== certo.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(certo))) return null;
  try { return JSON.parse(Buffer.from(corpo, 'base64url').toString()); } catch (e) { return null; }
}

// Bloqueio simples contra tentativas de adivinhar senha: 10 erros em 15 minutos.
async function muitasTentativas(email) {
  const n = Number(await db('GET', 'erros:' + email)) || 0;
  return n >= 10;
}
async function registrarErro(email) {
  await db('INCR', 'erros:' + email);
  await db('EXPIRE', 'erros:' + email, 900);
}

function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
function responder(res, status, dados) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
}
// Envolve cada função: só aceita os métodos indicados e devolve erro amigável se o banco falhar.
const rota = (metodos, fn) => async (req, res) => {
  if (!metodos.includes(req.method)) return responder(res, 405, { erro: 'Método não permitido.' });
  try { await fn(req, res); }
  catch (e) {
    console.error(e);
    const cfg = e.message === 'BANCO_NAO_CONFIGURADO';
    responder(res, 500, { erro: cfg ? 'O banco de dados ainda não foi configurado no Vercel.' : 'Erro no servidor. Tente de novo em instantes.' });
  }
};

// Cria uma sessão nova: o código "sid" muda, e isso desconecta qualquer outro celular.
async function novaSessao(email, usuario) {
  usuario.sid = crypto.randomBytes(12).toString('hex');
  usuario.ultimoLogin = new Date().toISOString();
  await setJ('usuario:' + email, usuario);
  return assinar({ e: email, s: usuario.sid });
}

module.exports = { db, getJ, setJ, normEmail, emailOk, hashSenha, senhaConfere, lerToken, muitasTentativas, registrarErro, corpo, responder, rota, novaSessao };
