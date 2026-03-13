<a id="top"></a>

# 🅽 Projeto Final - News Explorer (Fase 2: Back-end)

<!-- ⚙️ Tecnologias principais -->

[![Node](https://img.shields.io/badge/Node-v22.15.0-darkgreen?logo=node.js)](https://nodejs.org/pt)
[![Express](https://img.shields.io/badge/Express-Framework-lightgrey?logo=express)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-darkgreen?logo=mongodb)]()
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-red?logo=mongoose)]()

<!-- 🧰 Ferramentas e qualidade de código -->

[![ESLint](https://img.shields.io/badge/ESLint-Airbnb_Base-blue?logo=eslint)](https://www.npmjs.com/package/eslint-config-airbnb)
[![Prettier](https://img.shields.io/badge/Prettier-Code_Formatter-red?style=flat&logo=prettier&logoColor=black)](https://prettier.io/)
[![EditorConfig](https://img.shields.io/badge/EditorConfig-config-orange?logo=editorconfig&logoColor=white)](https://editorconfig.org/)
[![Husky](https://img.shields.io/badge/Husky-Git_Hooks-pink?logo=git)](https://typicode.github.io/husky/)
[![Lint-Staged](https://img.shields.io/badge/Lint_Staged-Precommit-green?logo=git)](https://github.com/okonet/lint-staged)

<!-- 💾 Infraestrutura e controle de versão -->

[![Winston](https://img.shields.io/badge/Winston-Logger-purple)](https://www.npmjs.com/package/winston)
[![dotenv](https://img.shields.io/badge/dotenv-Env_Variables-green)](https://www.npmjs.com/package/dotenv)
[![Git](https://img.shields.io/badge/Git-Control-646CFF?style=flat&logo=git)](https://git-scm.com/)
[![GitHub](https://img.shields.io/badge/Repo-Available-181717?style=flat&logo=github&logoColor=white)](https://github.com/VanessaYuriAB/web_project_api_full)

<!-- 🧪 Testes -->

[![Jest](https://img.shields.io/badge/Jest-Testing_Framework-C21325?logo=jest&logoColor=red)](https://jestjs.io/pt-BR/)
[![Supertest](https://img.shields.io/badge/Supertest-HTTP_Testing-darkgreen)](https://www.npmjs.com/package/supertest)

---

## 📑 Índice

1. [Descrição 📚](#-1-descrição)
2. [Funcionalidades 🚀](#-2-funcionalidades)
3. [Estrutura do Projeto 🗃️](#️-3-estrutura-do-projeto)
4. [Tecnologias Principais 🛠️](#️-4-tecnologias-principais)
5. [Rotas da API 🌐](#-5-rotas-da-api)
6. [Testes Automatizados 🧪](#-6-testes-automatizados)
7. [Screenshots 📸](#-7-screenshots)
8. [Instalação e Execução 📦](#-8-instalação-e-execução)
9. [Implantação 🔐](#-9-implantação)
10. [Checklist Atendido 📋](#-10-checklist-atendido)
11. [Status do Projeto 🚧](#-11-status-do-projeto)
12. [Melhorias 📈](#-12-melhorias)
13. [Autora 👩‍💻](#-13-autora)

---

<a id="-1-descrição"></a>

## 📚 1. Descrição

Esta é a **Fase 2 - Back‑end do projeto final News Explorer** do bootcamp TripleTen.

Aqui foi desenvolvida a **API RESTful** responsável por:

- Registrar usuários e autenticar via `JWT`
- Permitir que usuários salvem e removam artigos
- Retornar artigos vinculados ao usuário autenticado
- Proteger rotas com middleware de autorização
- Registrar logs de requisições e erros
- Validar corpo, cabeçalho e parâmetro com `celebrate/Joi`
- Rodar em modo de produção via servidor configurado com `HTTPS`

Este back‑end permite o uso completo do front‑end construído na Fase 1.

[Voltar ao topo 🔝](#top)

---

<a id="-2-funcionalidades"></a>

## 🚀 2. Funcionalidades

### Autenticação & Autorização 🔐

- Registro de usuários (`POST /signup`)
- Login e geração de `JWT` (`POST /signin`)
- Hash seguro de senha com `bcrypt`
- Proteção de rotas com middleware de autenticação

### Artigos Salvos 📰

- Criar artigo (`POST /articles`)
- Buscar artigos do usuário (`GET /articles`)
- Excluir artigo por ID (`DELETE /articles/:articleId`)
- Garantia de que usuários não podem excluir artigos de outros perfis

### Infraestrutura ⚙️

- Conexão com `MongoDB` via `Mongoose`
- Arquitetura modular (controllers, routes, middlewares)
- Logs estruturados (`request.log` e `error.log`)
- Centralização de erros
- Validações com `celebrate/Joi`
- Ambiente de produção com variáveis via `.env`

### Testes Automatizados ✅

- Testes de integração (HTTP + Banco de Dados)
- Testes com `Jest` e `Supertest`
- Execução em ambiente isolado (`NODE_ENV=test`)
- Banco de dados exclusivo para testes (`MongoDB local`)
- Testes de sucesso e de erro (400, 401, 403, 404)
- Validação de efeitos colaterais no banco (find, delete)
- Seeds reutilizáveis para:
  - Autenticação (signup + signin)
  - Artigos previamente cadastrados
- API exportada sem escutar porta durante os testes

[Voltar ao topo 🔝](#top)

---

<a id="-3-estrutura-do-projeto"></a>

## 🗃️ 3. Estrutura do Projeto

```
backend/
├─ controllers/
│ ├─ articles.js
│ └─ users.js
├─ errors/
│ ├─ ConfigError.js
│ ├─ ConflictError.js
│ ├─ ForbiddenError.js
│ ├─ NotFoundError.js
│ ├─ RateLimitError.js
│ └─ UnauthorizedError.js
├─ middlewares/
│ ├─ celebrates/
│ │ ├─ articles/
│ │ │ ├─ celebrateForDelete.js
│ │ │ └─ celebrateForPost.js
│ │ ├─ celebrateForAuth.js
│ │ ├─ celebrateForSignin.js
│ │ └─ celebrateForSignup.js
│ ├─ authHandler.js
│ ├─ errorHandler.js
│ ├─ limiter.js
│ ├─ logger.js
│ └─ notFoundPage.js
├─ models/
│ ├─ article.js
│ └─ user.js
├─ routes/
│ ├─ articles.js
│ └─ index.js
├─ tests/
│ ├─ fixtures/
│ │ └─ usersPayloads.js
│ ├─ integration/
| │ ├─ article.test.js
| │ └─ user.test.js
│ ├─ setup/
│ └─ jest.setup.js
├─ utils/
│ ├─ asyncHandlerControllers.js
│ ├─ configEnv.js
│ └─ errorsMsgs.js
├─ .env.template
├─ .gitignore
├─ .nvmrc
├─ ecosystem.config.js
├─ error.log
├─ jest.config.js
├─ package.json
├─ README.md
├─ request.log
└─ server.js
```

[Voltar ao topo 🔝](#top)

---

<a id="-4-tecnologias-principais"></a>

## 🛠️ 4. Tecnologias Principais

### Back‑end

- `Node.js`
- `Express`
- `MongoDB` + `Mongoose`
- `JWT`
- `bcryptjs`

### Validação, Segurança e Infraestrutura

- `celebrate` / `Joi`
- `Helmet`
- `express-rate-limit`
- `dotenv`
- `Winston` & `express-winston`

### Qualidade e Testes

- `Jest`
- `Supertest`
- `ESLint` (Airbnb Base)
- `Prettier`
- `Husky`
- `Lint‑Staged`

[Voltar ao topo 🔝](#top)

---

<a id="-5-rotas-da-api"></a>

## 🌐 5. Rotas da API

### Rotas Públicas 🔓

- `POST /signup`
- `POST /signin`

### Rotas Protegidas (JWT obrigatório) 🔐

- `GET /users/me`
- `GET /articles`
- `POST /articles`
- `DELETE /articles/:articleId`

📌 Apenas em desenvolvimento, uma rota `/csp-test` está disponível para validar manualmente o CSP (`connect-src`), garantindo que apenas origens explicitamente permitidas possam ser acessadas pelo navegador. A rota está desativada em produção e teste.

[Voltar ao topo 🔝](#top)

---

<a id="-6-testes-automatizados"></a>

## 🧪 6. Testes Automatizados

O projeto possui **testes de integração**, garantindo a confiabilidade da API em diferentes cenários.

### Tecnologias

- `Jest`
- `Supertest`

### Estratégia de Testes

- Ambiente isolado (`NODE_ENV=test`)
- Arquivo `.env.test` específico
- Banco de dados exclusivo para testes
- A aplicação **não escuta porta** durante os testes
- Conexão real com **MongoDB local**

### Cobertura

- Autenticação:
  - Cadastro de usuário
  - Login e geração de token
  - Tokens inválidos ou ausentes
- Artigos:
  - Criação de artigos
  - Listagem de artigos por usuário
  - Exclusão de artigos
  - Proteção contra exclusão por outros usuários
- Validações:
  - Body inválido
  - Params inválidos
  - Headers inválidos
- Erros HTTP:
  - `400` – Bad Request
  - `401` – Unauthorized
  - `403` – Forbidden
  - `404` – Not Found

### Execução dos testes

```shell
npm run test
```

Os testes são executados de forma sequencial (`--runInBand`) para evitar condições de corrida com o banco de dados.

[Voltar ao topo 🔝](#top)

---

<a id="-7-screenshots"></a>

## 📸 7. Screenshots

Os prints a seguir demonstram o funcionamento real dos middlewares, rotas e logs da API em ambiente local.

### Exemplo de logs (Winston) 📄

#### ➡️ `request.log`, ilustrando o fluxo de autenticação e manipulação de artigos na API:

![Request Log](./docs/images/request-log.png)

- _`POST /signup` → usuário criado com sucesso (`201`)_
- _`POST /signin` → usuário autenticado (`200`)_
- _`POST /articles` → artigo salvo utilizando `JWT` válido_
- _`GET /articles` → requisição com token inválido/expirado gerando `401`_
- _`GET /articles` → requisição com token válido retornando `200` com os artigos salvos pelo usuário_

Snippet modelo para cada log:

```json
{
  "level": "info",
  "message": "HTTP POST /signin",
  "meta": {
    "req": {
      "method": "POST",
      "url": "/signin",
      "headers": {
        "authorization": "Bearer <token>"
      }
    },
    "res": { "statusCode": 200 }
  }
}
```

#### ➡️ `error.log`, registro de quando o middleware de `rate limit` é acionado:

![Error Log](./docs/images/error-log.png)

Snippet higienizado:

```json
{
  "level": "error",
  "message": "middlewareError",
  "meta": {
    "date": "Tue Feb 10 2026 12:30:49 GMT-0300",
    "error": {
      "name": "RateLimitError",
      "statusCode": 429
    },
    "message": "uncaughtException: Muitas solicitações recebidas, tente novamente mais tarde.",
    "stack": "RateLimitError: Muitas solicitações recebidas, tente novamente mais tarde.\n    at Object.handler (.../middlewares/limiter.js:12:7)\n    at .../node_modules/express-rate-limit/dist/index.cjs:939:16",
    "req": {
      "method": "POST",
      "url": "/signin"
    }
  }
}
```

📌 Tokens, caminhos internos e informações sensíveis foram ocultados por segurança.

### Fluxo de autenticação 🔐

Requisições no `Postman` mostrando:

- `/signup`

![Signup](./docs/images/signup.png)

Snippet:

```json
{
  "user": {
    "email": "nome@newsapi.com",
    "password": "<hash-da-senha>",
    "name": "Nome",
    "_id": "698e1c5081705ec58f96568f"
  }
}
```

- `/signin`

![Signin](./docs/images/signin.png)

Snippet:

```json
{
  "token": "<jwt-token>"
}
```

📌 Token e informações sensíveis ocultados por segurança.

### CRUD de artigos funcionando ⚙️

- Operação `POST /articles`

![Post Artciles](./docs/images/post-articles.png)

- Operação `GET /articles`

![Get Articles](./docs/images/get-articles.png)

📌 Token ocultado por segurança.

[Voltar ao topo 🔝](#top)

---

<a id="-8-instalação-e-execução"></a>

## 📦 8. Instalação e Execução

1️⃣ Clone o repositório

```shell
git clone git@github.com:VanessaYuriAB/new-explorer-backend.git
```

2️⃣ Instale as dependências

```shell
npm install
```

3️⃣ Execute em modo desenvolvimento

```shell
npm run dev
```

📌 O projeto possui fallbacks para as variáveis de ambiente, portanto roda normalmente sem a configuração de um arquivo `.env`. Entretanto, há um `.env.template` como modelo.

📌 Uso do `.nvmrc`: este arquivo define a versão exata do `Node.js` utilizada no desenvolvimento e no ambiente de produção.

- Requisito: para que o comando `nvm use` funcione corretamente, é necessário possuir o **`NVM` (Node Version Manager) instalado, não apenas o `Node`**.

- Guia oficial: [`https://github.com/nvm-sh/nvm`](https://github.com/nvm-sh/nvm).

- Como ativar a versão correta do `Node`:

```Shell
nvm use
```

_O `NVM` irá ler automaticamente o arquivo `.nvmrc` e ativar a versão indicada._

- Caso a versão não esteja instalada:

```Shell
nvm install
```

- No servidor (`VM`):

```Shell
nvm use
npm install
```

_Isso garante que tanto a máquina local quanto a `VM` usem a **mesma versão do `Node`**, evitando erros de dependências sensíveis à versão, por exemplo o `bcrypt`._

### Executar testes

```shell
npm run test
```

📌 Durante os testes:

- O servidor não escuta porta
- O banco utilizado é exclusivo (`DB_NAME=newsexplorerdb_test`)
- Nenhuma configuração de produção é afetada

[Voltar ao topo 🔝](#top)

---

<a id="-9-implantação"></a>

## 🔐 9. Implantação

### Ambiente de Produção (`PM2` + `VM`):

- Servidor configurado na nuvem (`Google Cloud` recomendado)
- Domínio configurado e apontando para o servidor
- Certificados `HTTPS` instalados
- Variáveis de ambiente definidas no servidor, no arquivo `.env.production`, utilizando o arquivo `ecosystem.config.js` para iniciar o processo do `PM2`com ambiente em produção
- API acessível via domínio: `https://api.newsexplorer.sevencomets.com`

### Arquivo `ecosystem.config.js`:

O projeto utiliza o arquivo para gerenciar o processo em produção via `PM2`, garantindo restart automático, logs persistentes e variáveis de ambiente específicas para produção.

```JavaScript
module.exports = {
  apps: [
    {
      name: 'news-explorer-backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Permitindo iniciar o back‑end com:

```Shell
pm2 start ecosystem.config.js --env production
```

E manter o processo ativo mesmo após reinicialização da `VM`:

```Shell
pm2 startup
pm2 save
```

Assim, a API permanece estável, monitorada e pronta para receber tráfego em produção.

[Voltar ao topo 🔝](#top)

---

<a id="-10-checklist-atendido"></a>

## 📋 10. Checklist Atendido

✔ Estrutura de pastas seguindo boas práticas

✔ Hash seguro de senha

✔ `JWT` armazenado somente no servidor (chave em `.env`)

✔ Middlewares separados e organizados

✔ Logs de requisições e erros gerados

✔ Validações no corpo, parâmetros e headers

✔ Tratamento centralizado de erros

✔ API rodando via `HTTPS` em produção

✔ Usuários não podem deletar artigos de outros usuários

✔ Scripts `start` e `dev` funcionando

✔ `ESLint` com `Airbnb Base` configurado corretamente

[Voltar ao topo 🔝](#top)

---

<a id="-11-status-do-projeto"></a>

## 🚧 11. Status do Projeto

Concluído: aplicação full‑stack online 🎉

🔗 https://new-explorer-frontend.vercel.app

[Voltar ao topo 🔝](#top)

---

<a id="-12-melhorias"></a>

## 📈 12. Melhorias

- Remoção da função utilitária `handleAsync`: como o projeto já utiliza _Express 5.2.1_, exceções lançadas (`throw`) em controllers assíncronos são automaticamente encaminhadas para o middleware central de erros via `next()`. Desta forma, removendo o wrapper e aproveitando o suporte nativo do framework, é possível simplificar o fluxo de tratamento de erros nos controllers e reduzir boilerplate.

- Atualização dos _screenshots do README_: para demonstrar requisições do Postman com o link do _subdomínio da API_, refletindo o ambiente de produção do back‑end.

- Integração dos testes ao CI/CD (_GitHub Actions_).
- Aumento da cobertura de testes.
- Testes de carga (_rate limit_).
- Documentação da API com _Swagger / OpenAPI_.

[Voltar ao topo 🔝](#top)

---

<a id="-13-autora"></a>

## 👩‍💻 13. Autora

Desenvolvido por Vanessa Yuri A. Brito, unindo back‑end e front‑end para criar uma aplicação completa e escalável.

[Voltar ao topo 🔝](#top)
