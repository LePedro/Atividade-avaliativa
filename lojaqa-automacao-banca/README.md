# LojaQA — Banca de Testes E2E & API · Módulo 05

**Checkout: validação de CPF (Módulo 11) & auto-preenchimento por CEP (ViaCEP)**
Playwright + TypeScript · Prof. Alison Melo · FAP 2026

- Tela testada: [`checkout.html`](https://alisonmelo.github.io/tioalison-pe-t4-fap26/projetos-base/01-sistema-login/checkout.html)
- API: `https://api-qa-fap2026.onrender.com/api` (endpoint do checkout: `POST /orders`)
- Serviço externo do módulo: `GET https://viacep.com.br/ws/:cep/json/`

## Estrutura

```text
lojaqa-automacao-banca/
├── pages/
│   ├── Modulo05Page.ts          # POM do checkout (sem expect)
│   └── SauceDemoPage.ts         # POM do CT externo (sem expect)
├── fixtures/
│   ├── auth.fixture.ts          # sessaoCliente, produtoDisponivel e checkoutPage
│   └── global-setup.ts          # acorda a API (Render) e faz 1 login antes de tudo
├── tests/
│   ├── e2e/
│   │   ├── lojaqa-modulo-05.spec.ts   # CT01–CT10 na tela de checkout
│   │   └── externo-e2e.spec.ts        # 1 CT E2E no SauceDemo
│   └── api/
│       ├── lojaqa-api-05.spec.ts      # API01–API08 (ViaCEP + POST /orders)
│       └── externo-api.spec.ts        # 1 CT API no DummyJSON
├── data/checkout.data.ts        # massa: CPFs, CEPs, cartão de teste
├── utils/
│   ├── cpf.ts                   # oráculo do Módulo 11
│   ├── schema.ts                # validador de schema + log de status/headers/JSON
│   └── lojaqa.ts                # URLs, login via API com cache, produto com estoque
├── presentation/                # slides (PDF ou link)
├── playwright.config.ts
└── package.json
```

## Instalação

```bash
yarn install
yarn playwright install chromium
```

O `.env` é **opcional**: sem ele, os testes usam as URLs oficiais e o cliente do seed (`user@system.com`). Veja `.env.example`.

## Comandos da banca

| Momento | Comando |
|---|---|
| AO VIVO 1 – E2E em tela | `npx playwright test tests/e2e/lojaqa-modulo-05.spec.ts --headed` |
| AO VIVO 2 – API no console | `npx playwright test tests/api/lojaqa-api-05.spec.ts` |
| AO VIVO 3 – CTs externos | `npx playwright test tests/e2e/externo-e2e.spec.ts tests/api/externo-api.spec.ts --headed` |
| Tudo | `yarn test` |
| Relatório HTML | `yarn report` |
| Checar tipos | `yarn typecheck` |

> **Dica para a banca:** rode a suíte uma vez uns 10 minutos antes. A API no Render "dorme" e o primeiro acesso demora; além disso o token fica em cache por 1h e a apresentação não gasta login.

## Matriz de testes

| ID | Cenário | Tipo | Resultado esperado |
|---|---|---|---|
| CT01 | Abrir checkout com cliente logado e item no carrinho | E2E | Seções visíveis, e-mail do cliente preenchido, produto no resumo |
| CT02 | CPF válido (2 massas) | E2E | Máscara `000.000.000-00` e badge **CPF Válido** |
| CT03 | CPF com dígito verificador errado (2 massas) | E2E | Badge **CPF Inválido** |
| CT04 | CPF `111.111.111-11` | E2E | Deveria ser inválido → **bug conhecido** (`test.fail`) |
| CT05 | Finalizar com CPF inválido | E2E | Aviso "CPF inválido!" e nenhum `POST /orders` enviado |
| CT06 | CEP `01001-000` | E2E | Rua, bairro, cidade e UF preenchidos pelo ViaCEP; foco vai para "Número" |
| CT07 | CEP inexistente | E2E | "CEP não encontrado na base oficial dos Correios." |
| CT08 | CEP incompleto + Buscar | E2E | "Digite um CEP completo com 8 números." |
| CT09 | ViaCEP fora do ar (rede interceptada) | E2E | Mensagem para preenchimento manual |
| CT10 | Compra completa (CPF + CEP + cartão) | E2E | `POST /orders` 201 com CEP e CPF no endereço; redireciona ao painel |
| API01 | ViaCEP CEP válido | API | 200, `application/json`, **schema** completo e valores corretos |
| API02 | ViaCEP CEP inexistente | API | 200 com `"erro": "true"` |
| API03 | ViaCEP formato inválido | API | 400 |
| API04 | `POST /orders` com token | API | 201, schema do pedido, aparece em `GET /orders/me` |
| API05 | `POST /orders` sem token | API | 403 `Token não fornecido.` |
| API06 | `POST /orders` token inválido | API | 401 |
| API07 | `POST /orders` sem endereço | API | 400 |
| API08 | `POST /orders` acima do estoque | API | 409 `Estoque insuficiente` |
| EXT-E2E | SauceDemo: login → carrinho → compra | E2E externo | "Thank you for your order!" |
| EXT-API | DummyJSON `GET /products/1` | API externa | 200 + contrato do produto |

## Arquitetura e decisões

- **Login não é o foco:** o `global-setup.ts` faz **um** `POST /login` como cliente e grava o token em `.auth/cliente.json` (ignorado no git). A API limita a 5 logins por IP a cada 15 min; com o cache, ensaios repetidos não estouram esse limite.
- **Fixture `checkoutPage`:** grava `token`, `currentUser` e `lojaqa_cart` no `localStorage` (via `addInitScript`) exatamente como a tela de login e a vitrine fazem, e já abre o `checkout.html`. O produto do carrinho vem de `GET /products` (o de maior estoque).
- **POM sem asserções:** `Modulo05Page` só tem localizadores e ações. Os seletores são semânticos (`getByLabel`, `getByRole`); `#cpfStatusBadge`, `#cpfHelpMessage`, `#cepFeedbackBox` e `#checkoutNotice` usam id porque a aplicação não oferece papel ARIA nem `data-testid` nesses elementos.
- **Sem `waitForTimeout`:** a espera é sempre por evento observável (`waitForResponse` do ViaCEP, `expect` com auto-retry, captura do `POST /orders`).
- **Asserção de schema:** `utils/schema.ts` compara campos e tipos e a falha mostra exatamente o campo divergente.
- **Console para a banca:** os testes de API imprimem status, `Content-Type` e o JSON de cada resposta.

## Bugs encontrados na LojaQA (para o slide de lições)

1. **CPF com dígitos repetidos é aceito** (`111.111.111-11` aparece como "CPF Válido"). `validateCPF()` só bloqueia `00000000000`. Coberto pelo CT04 com `test.fail()`: quando corrigirem, o Playwright avisa.
2. **Redirecionamento com `orderId=undefined`** após a compra: a API devolve `{ order: { _id } }`, mas o `checkout.js` lê `orderData._id`. O CT10 registra isso como anotação `bug` no relatório HTML.

> O CT04 aparece com ✘ na saída `list`, mas é contado como **aprovado** (falha esperada). Vale explicar isso na apresentação.

## Observações

- CT10 e API04 criam pedidos reais (1 unidade) na API compartilhada da turma.
- O ViaCEP hoje devolve `"erro": "true"` (texto) para CEP inexistente; o teste aceita texto ou booleano.
