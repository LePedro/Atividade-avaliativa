import { test, expect } from '../../fixtures/auth.fixture';
import { LOJAQA_API_URL, TIMEOUT_API_MS, VIACEP_URL } from '../../utils/lojaqa';
import { errosDeSchema, itemPedidoSchema, logResposta, pedidoSchema, viaCepSchema } from '../../utils/schema';
import { cepInexistente, cepPracaDaSe, cpfsValidos } from '../../data/checkout.data';

/**
 * Módulo 05 — API.
 * Parte 1: GET https://viacep.com.br/ws/:cep/json/ com asserção de schema (contrato pedido no enunciado).
 * Parte 2: POST /orders da LojaQA, o endpoint que o checkout chama ao finalizar a compra.
 */
test.describe('Módulo 05 - API ViaCEP (contrato usado pelo checkout)', () => {
  test('API01 - CEP válido retorna 200, JSON e schema completo', async ({ request }) => {
    const resposta = await request.get(`${VIACEP_URL}/${cepPracaDaSe.digitado}/json/`);
    const corpo = await resposta.json();
    logResposta(`GET /ws/${cepPracaDaSe.digitado}/json/`, resposta, corpo);

    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['content-type']).toContain('application/json');
    expect(errosDeSchema(corpo, viaCepSchema)).toEqual([]);
    expect(corpo.cep).toMatch(/^\d{5}-\d{3}$/);
    expect(corpo.uf).toMatch(/^[A-Z]{2}$/);
    expect(corpo).toMatchObject({
      cep: cepPracaDaSe.mascarado,
      logradouro: cepPracaDaSe.logradouro,
      bairro: cepPracaDaSe.bairro,
      localidade: cepPracaDaSe.cidade,
      uf: cepPracaDaSe.uf
    });
  });

  test('API02 - CEP inexistente retorna 200 com a flag "erro" no payload', async ({ request }) => {
    const resposta = await request.get(`${VIACEP_URL}/${cepInexistente}/json/`);
    const corpo = await resposta.json();
    logResposta(`GET /ws/${cepInexistente}/json/`, resposta, corpo);

    expect(resposta.status()).toBe(200);
    // O ViaCEP passou a devolver "erro": "true" (texto) em vez de true (booleano).
    // String(...) aceita os dois formatos, que é exatamente como o checkout.js testa (if (data.erro)).
    expect(String(corpo.erro)).toBe('true');
    expect(corpo).not.toHaveProperty('logradouro');
  });

  test('API03 - CEP com formato inválido retorna 400', async ({ request }) => {
    const resposta = await request.get(`${VIACEP_URL}/0100/json/`);
    console.log(`\n=== GET /ws/0100/json/ ===\nStatus: ${resposta.status()} ${resposta.statusText()}`);

    expect(resposta.status()).toBe(400);
  });
});

test.describe('Módulo 05 - API LojaQA POST /orders (finalização do checkout)', () => {
  const urlPedidos = `${LOJAQA_API_URL}/orders`;
  const enderecoComCpf = `Praça da Sé, 100 - Sé, São Paulo/SP (CEP: ${cepPracaDaSe.mascarado}) | CPF: ${cpfsValidos[0].mascarado}`;

  test('API04 - cria o pedido (201) e ele aparece em GET /orders/me', async ({
    request,
    sessaoCliente,
    produtoDisponivel
  }) => {
    const auth = { Authorization: `Bearer ${sessaoCliente.token}` };

    const resposta = await request.post(urlPedidos, {
      headers: auth,
      data: {
        items: [{ productId: produtoDisponivel._id, quantity: 1 }],
        shippingAddress: enderecoComCpf
      },
      timeout: TIMEOUT_API_MS
    });
    const corpo = await resposta.json();
    logResposta('POST /orders', resposta, corpo);

    expect(resposta.status()).toBe(201);
    expect(resposta.headers()['content-type']).toContain('application/json');
    expect(corpo.message).toBe('Pedido criado com sucesso.');
    expect(errosDeSchema(corpo.order, pedidoSchema)).toEqual([]);
    expect(errosDeSchema(corpo.order.items[0], itemPedidoSchema)).toEqual([]);
    expect(corpo.order.status).toBe('pending');
    expect(corpo.order.shippingAddress).toBe(enderecoComCpf);
    expect(corpo.order.items[0]).toMatchObject({ productId: produtoDisponivel._id, quantity: 1 });
    expect(corpo.order.total).toBeCloseTo(corpo.order.items[0].unitPrice * 1, 2);

    const meusPedidos = await request.get(`${urlPedidos}/me`, { headers: auth, timeout: TIMEOUT_API_MS });
    expect(meusPedidos.status()).toBe(200);
    const lista = (await meusPedidos.json()) as { _id: string }[];
    expect(lista.map(p => p._id)).toContain(corpo.order._id);
  });

  test('API05 - sem token retorna 403 "Token não fornecido."', async ({ request, produtoDisponivel }) => {
    const resposta = await request.post(urlPedidos, {
      data: { items: [{ productId: produtoDisponivel._id, quantity: 1 }], shippingAddress: enderecoComCpf },
      timeout: TIMEOUT_API_MS
    });
    const corpo = await resposta.json();
    logResposta('POST /orders (sem token)', resposta, corpo);

    expect(resposta.status()).toBe(403);
    expect(corpo).toEqual({ error: 'Token não fornecido.' });
  });

  test('API06 - token inválido retorna 401', async ({ request, produtoDisponivel }) => {
    const resposta = await request.post(urlPedidos, {
      headers: { Authorization: 'Bearer token.invalido.qa' },
      data: { items: [{ productId: produtoDisponivel._id, quantity: 1 }], shippingAddress: enderecoComCpf },
      timeout: TIMEOUT_API_MS
    });
    const corpo = await resposta.json();
    logResposta('POST /orders (token inválido)', resposta, corpo);

    expect(resposta.status()).toBe(401);
    expect(corpo.error).toBe('Token inválido ou expirado.');
  });

  test('API07 - sem endereço de entrega retorna 400', async ({ request, sessaoCliente, produtoDisponivel }) => {
    const resposta = await request.post(urlPedidos, {
      headers: { Authorization: `Bearer ${sessaoCliente.token}` },
      data: { items: [{ productId: produtoDisponivel._id, quantity: 1 }], shippingAddress: '   ' },
      timeout: TIMEOUT_API_MS
    });
    const corpo = await resposta.json();
    logResposta('POST /orders (sem endereço)', resposta, corpo);

    expect(resposta.status()).toBe(400);
    expect(corpo.error).toBe('Itens e endereço de entrega são obrigatórios.');
  });

  test('API08 - quantidade acima do estoque retorna 409', async ({ request, sessaoCliente, produtoDisponivel }) => {
    const resposta = await request.post(urlPedidos, {
      headers: { Authorization: `Bearer ${sessaoCliente.token}` },
      data: {
        items: [{ productId: produtoDisponivel._id, quantity: produtoDisponivel.stock + 1000 }],
        shippingAddress: enderecoComCpf
      },
      timeout: TIMEOUT_API_MS
    });
    const corpo = await resposta.json();
    logResposta('POST /orders (estoque insuficiente)', resposta, corpo);

    expect(resposta.status()).toBe(409);
    expect(corpo.error).toContain('Estoque insuficiente');
  });
});
