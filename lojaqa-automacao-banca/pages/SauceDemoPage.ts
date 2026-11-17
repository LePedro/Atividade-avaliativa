import { Locator, Page } from '@playwright/test';

export interface DadosEntrega {
  nome: string;
  sobrenome: string;
  cep: string;
}

/**
 * Page Object do CT externo (SauceDemo).
 * O site expõe atributos data-test; o playwright.config define testIdAttribute: 'data-test',
 * então getByTestId() aponta para eles. Sem expect() aqui.
 */
export class SauceDemoPage {
  readonly usuarioInput: Locator;
  readonly senhaInput: Locator;
  readonly entrarButton: Locator;
  readonly tituloPagina: Locator;
  readonly adicionarMochilaButton: Locator;
  readonly carrinhoBadge: Locator;
  readonly carrinhoLink: Locator;
  readonly checkoutButton: Locator;
  readonly nomeInput: Locator;
  readonly sobrenomeInput: Locator;
  readonly cepInput: Locator;
  readonly continuarButton: Locator;
  readonly totalLabel: Locator;
  readonly finalizarButton: Locator;
  readonly confirmacao: Locator;

  constructor(private readonly page: Page) {
    this.usuarioInput = page.getByTestId('username');
    this.senhaInput = page.getByTestId('password');
    this.entrarButton = page.getByRole('button', { name: 'Login' });
    this.tituloPagina = page.getByTestId('title');
    this.adicionarMochilaButton = page.getByTestId('add-to-cart-sauce-labs-backpack');
    this.carrinhoBadge = page.getByTestId('shopping-cart-badge');
    this.carrinhoLink = page.getByTestId('shopping-cart-link');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.nomeInput = page.getByTestId('firstName');
    this.sobrenomeInput = page.getByTestId('lastName');
    this.cepInput = page.getByTestId('postalCode');
    this.continuarButton = page.getByRole('button', { name: 'Continue' });
    this.totalLabel = page.getByTestId('total-label');
    this.finalizarButton = page.getByRole('button', { name: 'Finish' });
    this.confirmacao = page.getByTestId('complete-header');
  }

  async abrir(): Promise<void> {
    await this.page.goto('https://www.saucedemo.com/');
  }

  async login(usuario: string, senha: string): Promise<void> {
    await this.usuarioInput.fill(usuario);
    await this.senhaInput.fill(senha);
    await this.entrarButton.click();
  }

  async adicionarMochilaAoCarrinho(): Promise<void> {
    await this.adicionarMochilaButton.click();
  }

  async irParaCheckout(): Promise<void> {
    await this.carrinhoLink.click();
    await this.checkoutButton.click();
  }

  async informarEntrega(dados: DadosEntrega): Promise<void> {
    await this.nomeInput.fill(dados.nome);
    await this.sobrenomeInput.fill(dados.sobrenome);
    await this.cepInput.fill(dados.cep);
    await this.continuarButton.click();
  }

  async finalizarCompra(): Promise<void> {
    await this.finalizarButton.click();
  }
}
