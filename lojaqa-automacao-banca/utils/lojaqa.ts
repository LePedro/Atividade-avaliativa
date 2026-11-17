import fs from 'node:fs';
import path from 'node:path';
import { APIRequestContext } from '@playwright/test';

/** Endereços oficiais (podem ser sobrescritos pelo .env). */
export const LOJAQA_FRONT_URL =
  process.env.LOJAQA_FRONT_URL ??
  'https://alisonmelo.github.io/tioalison-pe-t4-fap26/projetos-base/01-sistema-login';

export const LOJAQA_API_URL = process.env.LOJAQA_API_URL ?? 'https://api-qa-fap2026.onrender.com/api';

export const VIACEP_URL = process.env.VIACEP_URL ?? 'https://viacep.com.br/ws';

/** Usuário cliente do seed da turma (o checkout é exclusivo para perfil "user"). */
const CLIENTE_EMAIL = process.env.LOJAQA_CLIENTE_EMAIL ?? 'user@system.com';
const CLIENTE_SENHA = process.env.LOJAQA_CLIENTE_SENHA ?? 'UserPassword123';

/** A API no Render pode "acordar" devagar (cold start). */
export const TIMEOUT_API_MS = 60_000;

export interface UsuarioLogado {
  email: string;
  name: string;
  role: 'user' | 'seller' | 'admin' | 'blocked';
}

export interface SessaoCliente {
  token: string;
  user: UsuarioLogado;
}

export interface Produto {
  _id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
}

/** Formato do item que a vitrine (loja.js) grava em localStorage['lojaqa_cart']. */
export interface ItemCarrinho {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
}

const ARQUIVO_SESSAO = path.resolve(__dirname, '..', '.auth', 'cliente.json');

/** Lê o "exp" (segundos) do payload do JWT sem validar a assinatura. */
function expiracaoDoToken(token: string): number {
  const payload = token.split('.')[1] ?? '';
  const json = Buffer.from(payload, 'base64url').toString('utf-8');
  const { exp } = JSON.parse(json) as { exp?: number };
  return exp ?? 0;
}

/** Sessão em cache válida por pelo menos mais 10 minutos? */
function lerSessaoEmCache(): SessaoCliente | null {
  if (!fs.existsSync(ARQUIVO_SESSAO)) return null;
  try {
    const sessao = JSON.parse(fs.readFileSync(ARQUIVO_SESSAO, 'utf-8')) as SessaoCliente;
    const restanteSeg = expiracaoDoToken(sessao.token) - Date.now() / 1000;
    return restanteSeg > 10 * 60 ? sessao : null;
  } catch {
    return null;
  }
}

/**
 * Devolve a sessão do cliente. O login (POST /login) só é feito quando não há token
 * válido em cache, porque a API limita a 5 logins por IP a cada 15 minutos (429).
 * O token dura 1h, então ensaios repetidos antes da banca reaproveitam o mesmo token.
 */
export async function obterSessaoCliente(request: APIRequestContext): Promise<SessaoCliente> {
  const emCache = lerSessaoEmCache();
  if (emCache) return emCache;

  const resposta = await request.post(`${LOJAQA_API_URL}/login`, {
    data: { email: CLIENTE_EMAIL, password: CLIENTE_SENHA },
    timeout: TIMEOUT_API_MS
  });

  if (resposta.status() === 429) {
    throw new Error('API LojaQA bloqueou o login (429 - limite de 5 logins/15 min por IP). Aguarde e rode de novo.');
  }
  if (!resposta.ok()) {
    throw new Error(`Falha no login do cliente (${resposta.status()}): ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as SessaoCliente;
  const sessao: SessaoCliente = { token: corpo.token, user: corpo.user };

  fs.mkdirSync(path.dirname(ARQUIVO_SESSAO), { recursive: true });
  fs.writeFileSync(ARQUIVO_SESSAO, JSON.stringify(sessao, null, 2));
  return sessao;
}

/** Escolhe o produto ativo com maior estoque, para não esgotar itens durante os ensaios. */
export async function obterProdutoDisponivel(request: APIRequestContext): Promise<Produto> {
  const resposta = await request.get(`${LOJAQA_API_URL}/products`, { timeout: TIMEOUT_API_MS });
  if (!resposta.ok()) {
    throw new Error(`Não foi possível listar produtos (${resposta.status()}).`);
  }
  const produtos = (await resposta.json()) as Produto[];
  const comEstoque = produtos.filter(p => p.active !== false && p.stock > 0);
  if (!comEstoque.length) throw new Error('Nenhum produto com estoque na vitrine da LojaQA.');
  return comEstoque.reduce((maior, atual) => (atual.stock > maior.stock ? atual : maior));
}
