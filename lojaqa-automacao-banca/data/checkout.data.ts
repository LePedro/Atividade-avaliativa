import { DadosCartao } from '../pages/Modulo05Page';

/** CPFs digitados só com números; a tela aplica a máscara 000.000.000-00. */
export const cpfsValidos: { cpf: string; mascarado: string }[] = [
  { cpf: '52998224725', mascarado: '529.982.247-25' },
  { cpf: '11144477735', mascarado: '111.444.777-35' }
];

export const cpfsComDigitoErrado: { cpf: string; mascarado: string; motivo: string }[] = [
  { cpf: '52998224726', mascarado: '529.982.247-26', motivo: '2º dígito verificador errado' },
  { cpf: '12345678900', mascarado: '123.456.789-00', motivo: 'dígitos verificadores errados' }
];

/** Todos os dígitos iguais passam no Módulo 11, mas não são CPFs válidos (Receita Federal). */
export const cpfDigitosRepetidos = { cpf: '11111111111', mascarado: '111.111.111-11' };

export const cepPracaDaSe = {
  digitado: '01001000',
  mascarado: '01001-000',
  logradouro: 'Praça da Sé',
  bairro: 'Sé',
  cidade: 'São Paulo',
  uf: 'SP'
};

export const cepInexistente = '99999999';

export const cartaoTeste: DadosCartao = {
  numero: '4111111111111111',
  nomeImpresso: 'ALUNO QA TESTE',
  validade: '1230',
  cvv: '123'
};
