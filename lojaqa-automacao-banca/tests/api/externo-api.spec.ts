import { test, expect } from '@playwright/test';
import { Schema, errosDeSchema, logResposta } from '../../utils/schema';

const produtoSchema: Schema = {
  id: 'number',
  title: 'string',
  price: 'number',
  category: 'string',
  stock: 'number'
};

test('CT externo API - DummyJSON GET /products/1 retorna o produto com contrato válido', async ({ request }) => {
  const resposta = await request.get('https://dummyjson.com/products/1');
  const corpo = await resposta.json();
  logResposta('DummyJSON GET /products/1', resposta, {
    id: corpo.id,
    title: corpo.title,
    price: corpo.price,
    category: corpo.category,
    stock: corpo.stock
  });

  expect(resposta.status()).toBe(200);
  expect(resposta.ok()).toBeTruthy();
  expect(resposta.headers()['content-type']).toContain('application/json');
  expect(errosDeSchema(corpo, produtoSchema)).toEqual([]);
  expect(corpo.id).toBe(1);
  expect(corpo.price).toBeGreaterThan(0);
});
