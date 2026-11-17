import { APIResponse } from '@playwright/test';

type TipoCampo = 'string' | 'number' | 'boolean' | 'object' | 'array';

/** Contrato simples: nome do campo -> tipo esperado. */
export type Schema = Record<string, TipoCampo>;

/**
 * Compara um objeto JSON com o schema e devolve a lista de divergências.
 * Uso: expect(errosDeSchema(body, meuSchema)).toEqual([])  -> a falha mostra exatamente o campo errado.
 */
export function errosDeSchema(objeto: unknown, schema: Schema): string[] {
  if (typeof objeto !== 'object' || objeto === null || Array.isArray(objeto)) {
    return ['payload não é um objeto JSON'];
  }
  const registro = objeto as Record<string, unknown>;
  const erros: string[] = [];

  for (const [campo, tipoEsperado] of Object.entries(schema)) {
    if (!(campo in registro)) {
      erros.push(`campo ausente: ${campo}`);
      continue;
    }
    const valor = registro[campo];
    const tipoReal = Array.isArray(valor) ? 'array' : valor === null ? 'null' : typeof valor;
    if (tipoReal !== tipoEsperado) {
      erros.push(`${campo}: esperado ${tipoEsperado}, recebido ${tipoReal}`);
    }
  }
  return erros;
}

/** Contrato do ViaCEP para um CEP encontrado (GET /ws/:cep/json/). */
export const viaCepSchema: Schema = {
  cep: 'string',
  logradouro: 'string',
  complemento: 'string',
  bairro: 'string',
  localidade: 'string',
  uf: 'string',
  ibge: 'string',
  ddd: 'string'
};

/** Contrato do pedido devolvido pela LojaQA (POST /orders -> body.order). */
export const pedidoSchema: Schema = {
  _id: 'string',
  customerId: 'string',
  items: 'array',
  total: 'number',
  status: 'string',
  shippingAddress: 'string',
  createdAt: 'string'
};

export const itemPedidoSchema: Schema = {
  productId: 'string',
  name: 'string',
  quantity: 'number',
  unitPrice: 'number'
};

/** Mostra no console o que a banca precisa ver: status, headers relevantes e o JSON. */
export function logResposta(titulo: string, resposta: APIResponse, corpo: unknown): void {
  const headers = resposta.headers();
  console.log(`\n=== ${titulo} ===`);
  console.log(`Status: ${resposta.status()} ${resposta.statusText()}`);
  console.log(`Content-Type: ${headers['content-type']}`);
  console.log('JSON:', JSON.stringify(corpo, null, 2));
}
