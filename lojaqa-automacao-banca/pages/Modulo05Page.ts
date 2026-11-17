import { Locator, Page, Response } from '@playwright/test';
import { LOJAQA_FRONT_URL } from '../utils/lojaqa';

export interface PedidoCapturado {
  status: number;
  corpo: {
    message?: string;
    error?: string;
    order?: { _id: string; shippingAddress: string; total: number; status: string };
  };
}

export interface DadosCartao {
  numero: string;
  nomeImpresso: string;
  validade: string;
  cvv: string;
}

/**
 * Page Object do Módulo 05 — Checkout da LojaQA (checkout.html).
 * Só localizadores e ações: nenhum expect() aqui. As asserções ficam nos specs.
 */
export class Modulo05Page {
  // Cabeçalhos das seções
  readonly secaoIdentificacao: Locator;
  readonly secaoEndereco: Locator;

  // 1. Identificação do comprador
  readonly nomeInput: Locator;
  readonly emailInput: Locator;
  readonly cpfInput: Locator;
  readonly cpfStatus: Locator;
  readonly cpfMensagem: Locator;

  // 2. Endereço de entrega (ViaCEP)
  readonly cepInput: Locator;
  readonly buscarCepButton: Locator;
  readonly cepMensagem: Locator;
  readonly logradouroInput: Locator;
  readonly numeroInput: Locator;
  readonly bairroInput: Locator;
  readonly cidadeInput: Locator;
  readonly ufInput: Locator;

  // 4. Pagamento (cartão)
  readonly numeroCartaoInput: Locator;
  readonly nomeCartaoInput: Locator;
  readonly validadeCartaoInput: Locator;
  readonly cvvInput: Locator;

  // Resumo e finalização
  readonly resumoItens: Locator;
  readonly finalizarButton: Locator;
  readonly aviso: Locator;

  constructor(private readonly page: Page) {
    this.secaoIdentificacao = page.getByRole('heading', { name: 'Identificação do Comprador' });
    this.secaoEndereco = page.getByRole('heading', { name: 'Endereço de Entrega' });

    this.nomeInput = page.getByLabel('Nome Completo');
    this.emailInput = page.getByLabel('E-mail para Confirmação');
    this.cpfInput = page.getByLabel(/CPF do Titular/);
    // Badge e texto de ajuda não têm papel ARIA nem data-testid na aplicação: id é o único gancho estável.
    this.cpfStatus = page.locator('#cpfStatusBadge');
    this.cpfMensagem = page.locator('#cpfHelpMessage');

    this.cepInput = page.getByLabel('CEP', { exact: true });
    this.buscarCepButton = page.getByRole('button', { name: 'Buscar CEP' });
    this.cepMensagem = page.locator('#cepFeedbackBox');
    this.logradouroInput = page.getByLabel(/Logradouro/);
    this.numeroInput = page.getByLabel('Número', { exact: true });
    this.bairroInput = page.getByLabel('Bairro', { exact: true });
    this.cidadeInput = page.getByLabel('Cidade', { exact: true });
    this.ufInput = page.getByLabel('Estado (UF)');

    this.numeroCartaoInput = page.getByLabel('Número do Cartão');
    this.nomeCartaoInput = page.getByLabel('Nome Impresso no Cartão');
    this.validadeCartaoInput = page.getByLabel('Validade (MM/AA)');
    this.cvvInput = page.getByLabel('Código CVV');

    this.resumoItens = page.locator('#summaryProductsList');
    this.finalizarButton = page.getByRole('button', { name: 'Confirmar e Finalizar Pedido' });
    this.aviso = page.locator('#checkoutNotice');
  }

  async goto(): Promise<void> {
    await this.page.goto(`${LOJAQA_FRONT_URL}/checkout.html`);
  }

  /** Digita tecla a tecla para a máscara (000.000.000-00) ser aplicada como um usuário real. */
  async digitarCPF(cpf: string): Promise<void> {
    await this.cpfInput.clear();
    await this.cpfInput.pressSequentially(cpf);
  }

  /**
   * Digita o CEP e devolve a resposta do ViaCEP disparada automaticamente
   * ao completar 8 dígitos. Espera pelo evento de rede, nunca por tempo fixo.
   */
  async digitarCEPEAguardarViaCEP(cep: string): Promise<Response> {
    const respostaViaCep = this.page.waitForResponse(res => res.url().includes('viacep.com.br/ws/'));
    await this.cepInput.clear();
    await this.cepInput.pressSequentially(cep);
    return respostaViaCep;
  }

  /** Digita o CEP sem esperar rede (ex.: CEP incompleto ou ViaCEP simulado fora do ar). */
  async digitarCEP(cep: string): Promise<void> {
    await this.cepInput.clear();
    await this.cepInput.pressSequentially(cep);
  }

  async clicarBuscarCEP(): Promise<void> {
    await this.buscarCepButton.click();
  }

  async preencherNumero(numero: string): Promise<void> {
    await this.numeroInput.fill(numero);
  }

  async preencherCartao(cartao: DadosCartao): Promise<void> {
    await this.numeroCartaoInput.pressSequentially(cartao.numero);
    await this.nomeCartaoInput.fill(cartao.nomeImpresso);
    await this.validadeCartaoInput.pressSequentially(cartao.validade);
    await this.cvvInput.fill(cartao.cvv);
  }

  async finalizarPedido(): Promise<void> {
    await this.finalizarButton.click();
  }

  /**
   * Clica em finalizar e devolve status + JSON do POST /orders feito pela página.
   * O checkout redireciona logo após a resposta, e aí o navegador descarta o corpo.
   * Por isso a requisição é interceptada: route.fetch() faz a chamada real à API,
   * guardamos o JSON e entregamos a MESMA resposta para a página (nada é simulado).
   */
  async finalizarPedidoCapturandoResposta(): Promise<PedidoCapturado> {
    let entregar!: (pedido: PedidoCapturado) => void;
    const capturado = new Promise<PedidoCapturado>(resolve => (entregar = resolve));

    await this.page.route('**/api/orders', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const resposta = await route.fetch();
      const corpo = (await resposta.json()) as PedidoCapturado['corpo'];
      await route.fulfill({ response: resposta });
      entregar({ status: resposta.status(), corpo });
    });

    await this.finalizarButton.click();
    return capturado;
  }
}
