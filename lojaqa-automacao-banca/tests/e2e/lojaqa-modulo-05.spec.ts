import { test, expect } from '../../fixtures/auth.fixture';
import { validarCPF } from '../../utils/cpf';
import {
  cartaoTeste,
  cepInexistente,
  cepPracaDaSe,
  cpfDigitosRepetidos,
  cpfsComDigitoErrado,
  cpfsValidos
} from '../../data/checkout.data';

/**
 * Módulo 05 — Checkout: validação de CPF (Módulo 11) & auto-preenchimento por CEP (ViaCEP).
 * A fixture `checkoutPage` entrega a tela já aberta com cliente logado e 1 item no carrinho
 * (o login não é o foco: é feito uma vez via API, como setup).
 */
test.describe('Módulo 05 - Checkout LojaQA: CPF & ViaCEP', () => {
  test('CT01 - abre o checkout com o cliente identificado e o item no resumo', async ({
    checkoutPage,
    sessaoCliente,
    produtoDisponivel
  }) => {
    await expect(checkoutPage.secaoIdentificacao).toBeVisible();
    await expect(checkoutPage.secaoEndereco).toBeVisible();
    await expect(checkoutPage.emailInput).toHaveValue(sessaoCliente.user.email);
    await expect(checkoutPage.resumoItens).toContainText(produtoDisponivel.name);
    await expect(checkoutPage.cpfStatus).toHaveText('Aguardando CPF');
  });

  test.describe('Validação de CPF (máscara + Módulo 11)', () => {
    for (const { cpf, mascarado } of cpfsValidos) {
      test(`CT02 - aplica a máscara e aprova o CPF válido ${mascarado}`, async ({ checkoutPage }) => {
        expect(validarCPF(cpf), 'oráculo: o CPF da massa precisa ser válido').toBe(true);

        await checkoutPage.digitarCPF(cpf);

        await expect(checkoutPage.cpfInput).toHaveValue(mascarado);
        await expect(checkoutPage.cpfStatus).toHaveText('CPF Válido');
        await expect(checkoutPage.cpfMensagem).toContainText('aprovado');
      });
    }

    for (const { cpf, mascarado, motivo } of cpfsComDigitoErrado) {
      test(`CT03 - rejeita ${mascarado} (${motivo})`, async ({ checkoutPage }) => {
        expect(validarCPF(cpf), 'oráculo: o CPF da massa precisa ser inválido').toBe(false);

        await checkoutPage.digitarCPF(cpf);

        await expect(checkoutPage.cpfInput).toHaveValue(mascarado);
        await expect(checkoutPage.cpfStatus).toHaveText('CPF Inválido');
        await expect(checkoutPage.cpfMensagem).toContainText('Dígitos verificadores incorretos');
      });
    }

    test('CT04 - [BUG] CPF com todos os dígitos iguais deveria ser rejeitado', async ({ checkoutPage }) => {
      // Defeito conhecido: validateCPF() do checkout.js só barra "00000000000".
      // test.fail() = esperamos que ESTE teste falhe enquanto o bug existir.
      // Se o time de dev corrigir, o Playwright avisa que o teste "passou inesperadamente".
      test.fail(true, 'BUG: checkout aceita 111.111.111-11 como CPF válido');
      expect(validarCPF(cpfDigitosRepetidos.cpf), 'oráculo: dígitos repetidos são inválidos').toBe(false);

      await checkoutPage.digitarCPF(cpfDigitosRepetidos.cpf);

      await expect(checkoutPage.cpfInput).toHaveValue(cpfDigitosRepetidos.mascarado);
      await expect(checkoutPage.cpfStatus).toHaveText('CPF Inválido', { timeout: 3_000 });
    });

    test('CT05 - impede finalizar o pedido com CPF inválido', async ({ checkoutPage, page }) => {
      const pedidosEnviados: string[] = [];
      page.on('request', req => {
        if (req.url().endsWith('/api/orders')) pedidosEnviados.push(req.method());
      });

      await checkoutPage.digitarCPF(cpfsComDigitoErrado[0].cpf);
      await checkoutPage.finalizarPedido();

      await expect(checkoutPage.aviso).toHaveText(/CPF inválido!/);
      await expect(page).toHaveURL(/checkout\.html/);
      expect(pedidosEnviados, 'nenhum POST /orders deve sair com CPF inválido').toEqual([]);
    });
  });

  test.describe('Endereço por CEP (ViaCEP)', () => {
    test('CT06 - preenche o endereço automaticamente com CEP válido', async ({ checkoutPage }) => {
      const resposta = await checkoutPage.digitarCEPEAguardarViaCEP(cepPracaDaSe.digitado);

      expect(resposta.status()).toBe(200);
      await expect(checkoutPage.cepInput).toHaveValue(cepPracaDaSe.mascarado);
      await expect(checkoutPage.logradouroInput).toHaveValue(cepPracaDaSe.logradouro);
      await expect(checkoutPage.bairroInput).toHaveValue(cepPracaDaSe.bairro);
      await expect(checkoutPage.cidadeInput).toHaveValue(cepPracaDaSe.cidade);
      await expect(checkoutPage.ufInput).toHaveValue(cepPracaDaSe.uf);
      await expect(checkoutPage.cepMensagem).toContainText('Localizado: São Paulo - SP');
      await expect(checkoutPage.numeroInput).toBeFocused();
    });

    test('CT07 - informa quando o CEP não existe', async ({ checkoutPage }) => {
      await checkoutPage.digitarCEPEAguardarViaCEP(cepInexistente);

      await expect(checkoutPage.cepMensagem).toHaveText('CEP não encontrado na base oficial dos Correios.');
      await expect(checkoutPage.logradouroInput).toHaveValue('');
    });

    test('CT08 - pede o CEP completo ao buscar com menos de 8 dígitos', async ({ checkoutPage }) => {
      await checkoutPage.digitarCEP('0100');
      await checkoutPage.clicarBuscarCEP();

      await expect(checkoutPage.cepMensagem).toHaveText('Digite um CEP completo com 8 números.');
    });

    test('CT09 - ViaCEP fora do ar: libera preenchimento manual', async ({ checkoutPage, page }) => {
      // Simula a queda do serviço externo interceptando a chamada de rede.
      await page.route('**/viacep.com.br/ws/**', route => route.abort('internetdisconnected'));

      await checkoutPage.digitarCEP(cepPracaDaSe.digitado);

      await expect(checkoutPage.cepMensagem).toHaveText(/Não foi possível consultar o CEP automaticamente/);
      await expect(checkoutPage.logradouroInput).toBeEditable();
    });
  });

  test('CT10 - finaliza o pedido com CPF válido e endereço vindo do ViaCEP', async ({ checkoutPage, page }) => {
    const cpf = cpfsValidos[0];

    await checkoutPage.digitarCPF(cpf.cpf);
    await expect(checkoutPage.cpfStatus).toHaveText('CPF Válido');

    await checkoutPage.digitarCEPEAguardarViaCEP(cepPracaDaSe.digitado);
    await expect(checkoutPage.cidadeInput).toHaveValue(cepPracaDaSe.cidade);
    await checkoutPage.preencherNumero('100');
    await checkoutPage.preencherCartao(cartaoTeste);

    const { status, corpo } = await checkoutPage.finalizarPedidoCapturandoResposta();
    console.log(`POST /orders -> ${status} | pedido ${corpo.order?._id ?? corpo.error}`);
    console.log(`shippingAddress: ${corpo.order?.shippingAddress}`);

    expect(status).toBe(201);
    expect(corpo.order?.shippingAddress).toContain(`CEP: ${cepPracaDaSe.mascarado}`);
    expect(corpo.order?.shippingAddress).toContain(`CPF: ${cpf.mascarado}`);
    await expect(page).toHaveURL(/painel\.html\?orderId=/);

    // Achado de QA: a API devolve { message, order: { _id } }, mas o checkout.js lê orderData._id
    // (que não existe) e redireciona para ?orderId=undefined. Registrado no relatório sem quebrar o fluxo.
    if (page.url().includes('orderId=undefined')) {
      test.info().annotations.push({
        type: 'bug',
        description: `Redirecionou para orderId=undefined; o id real é ${corpo.order?._id}`
      });
    }
  });
});
