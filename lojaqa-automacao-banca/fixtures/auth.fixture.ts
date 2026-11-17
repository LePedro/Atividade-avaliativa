import { test as base, expect } from '@playwright/test';
import { Modulo05Page } from '../pages/Modulo05Page';
import {
  ItemCarrinho,
  Produto,
  SessaoCliente,
  obterProdutoDisponivel,
  obterSessaoCliente
} from '../utils/lojaqa';

type WorkerFixtures = {
  /** Token JWT + usuário cliente (login via API, reaproveitado do cache). */
  sessaoCliente: SessaoCliente;
  /** Produto real da vitrine, com estoque, usado no carrinho e nos pedidos. */
  produtoDisponivel: Produto;
};

type TestFixtures = {
  /** Tela de checkout já aberta com cliente autenticado e 1 item no carrinho. */
  checkoutPage: Modulo05Page;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sessaoCliente: [
    async ({ playwright }, use) => {
      const contexto = await playwright.request.newContext();
      const sessao = await obterSessaoCliente(contexto);
      await contexto.dispose();
      await use(sessao);
    },
    { scope: 'worker' }
  ],

  produtoDisponivel: [
    async ({ playwright }, use) => {
      const contexto = await playwright.request.newContext();
      const produto = await obterProdutoDisponivel(contexto);
      await contexto.dispose();
      await use(produto);
    },
    { scope: 'worker' }
  ],

  checkoutPage: async ({ page, sessaoCliente, produtoDisponivel }, use) => {
    const carrinho: ItemCarrinho[] = [
      {
        productId: produtoDisponivel._id,
        name: produtoDisponivel.name,
        price: produtoDisponivel.price,
        stock: produtoDisponivel.stock,
        quantity: 1
      }
    ];

    // Grava a sessão e o carrinho no localStorage ANTES dos scripts da página rodarem,
    // exatamente como o login (script.js) e a vitrine (loja.js) fariam.
    // O sessionStorage garante que isso aconteça só na 1ª carga da aba.
    await page.addInitScript(
      ({ token, user, cart }) => {
        try {
          if (sessionStorage.getItem('qa_sessao_injetada')) return;
          sessionStorage.setItem('qa_sessao_injetada', '1');
          localStorage.setItem('token', token);
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('lojaqa_cart', JSON.stringify(cart));
        } catch {
          // about:blank não tem storage; ignorar.
        }
      },
      { token: sessaoCliente.token, user: sessaoCliente.user, cart: carrinho }
    );

    const checkout = new Modulo05Page(page);
    await checkout.goto();
    await use(checkout);
  }
});

export { expect };
