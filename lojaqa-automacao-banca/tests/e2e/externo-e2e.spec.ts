import { test, expect } from '@playwright/test';
import { SauceDemoPage } from '../../pages/SauceDemoPage';

test('CT externo E2E - comprar a mochila no SauceDemo do login à confirmação', async ({ page }) => {
  const loja = new SauceDemoPage(page);

  await loja.abrir();
  await loja.login('standard_user', 'secret_sauce');
  await expect(page).toHaveURL(/inventory\.html/);
  await expect(loja.tituloPagina).toHaveText('Products');

  await loja.adicionarMochilaAoCarrinho();
  await expect(loja.carrinhoBadge).toHaveText('1');

  await loja.irParaCheckout();
  await loja.informarEntrega({ nome: 'Aluno', sobrenome: 'QA', cep: '01001-000' });
  await expect(page).toHaveURL(/checkout-step-two\.html/);
  await expect(loja.totalLabel).toContainText('Total: $');

  await loja.finalizarCompra();
  await expect(page).toHaveURL(/checkout-complete\.html/);
  await expect(loja.confirmacao).toHaveText('Thank you for your order!');
});
