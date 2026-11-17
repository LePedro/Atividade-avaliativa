import { request } from '@playwright/test';
import { LOJAQA_API_URL, TIMEOUT_API_MS, obterSessaoCliente } from '../utils/lojaqa';

/**
 * Roda UMA vez antes de todos os workers:
 * 1. "Acorda" a API no Render (cold start) para a demonstração não travar no 1º teste;
 * 2. Faz o login do cliente uma única vez e grava o token em .auth/cliente.json.
 * Assim os workers em paralelo não disparam vários logins (limite de 5 por 15 min).
 */
export default async function globalSetup(): Promise<void> {
  const contexto = await request.newContext();
  try {
    await contexto.get(`${LOJAQA_API_URL}/health`, { timeout: TIMEOUT_API_MS });
    await obterSessaoCliente(contexto);
  } catch (erro) {
    // Não derruba os CTs externos: só os testes que dependem da sessão vão falhar, com a mensagem clara.
    console.warn(`[global-setup] Sessão da LojaQA não preparada: ${(erro as Error).message}`);
  } finally {
    await contexto.dispose();
  }
}
