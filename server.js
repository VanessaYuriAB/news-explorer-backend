// --------
// Dotenv
// --------

// 1) Carrega dotenv primeiro de tudo — absolutamente no topo
const dotenv = require('dotenv');

// Carrega dotenv dinamicamente
// Pacote dotenv só lê .env., mas é possível especificar qual arquivo carregar
// Ao rodar scripts (ou comandos), o Express pega variáveis do NODE_ENV definido
// Ex: npm run dev pega variáveis do .env.development
const resultEnv = dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
});

// Loga retorno sobre .env, se estiver em ambiente de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  if (resultEnv.error) {
    console.warn(
      `Nenhum arquivo .env.${process.env.NODE_ENV} encontrado — usando fallbacks`,
    );
  } else {
    console.log(`Arquivo env carregado: .env.${process.env.NODE_ENV}`);
  }
}

// Executa função de configuração env: fallback para desenvolvimento e verificação
// para produção
require('./utils/configEnv')();

// 2) Agora sim, importa módulos que podem usar process.env

const express = require('express');

const cors = require('cors');

const helmet = require('helmet');

const mongoose = require('mongoose');

const { errors } = require('celebrate');

const routes = require('./routes/index');

const limiter = require('./middlewares/limiter');

const { requestLogger, errorLogger } = require('./middlewares/logger');

const notFoundPage = require('./middlewares/notFoundPage');

const handleError = require('./middlewares/errorHandler');

const ForbiddenError = require('./errors/ForbiddenError');

// --------
// Express
// --------

// Cria um aplicativo Express
const app = express();

// ------
// CORS
// ------

// fallback seguro, impede crashes se a env estiver faltando
// '.split(',')' para transformar a string em array
// '.map()' com 'trim()' para remover qlqr espaço em branco que possa ter
// '.filter(Boolean)' remove entradas vazias automaticamente, tudo que é “falsey”
const allowedCors = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

// Configuração com opções específicas
const corsOptions = {
  // O callback é uma função fornecida pelo middleware cors para indicar se a origem
  // é permitida
  // Espera dois parâmetros: callback(error, allow)
  // error: null se não houve erro ou um objeto Error para bloquear
  // allow: true se a origem é permitida ou false se não

  origin: (origin, callback) => {
    // Se não houver origin (Postman, curl, apps mobile), permite
    if (!origin) {
      return callback(null, true);
    }

    // Se houver origin e estiver na lista, permite
    if (allowedCors.includes(origin)) {
      return callback(null, true);
    }

    // Caso contrário, bloqueia

    // Cria um erro customizado com name
    const corsError = new ForbiddenError(
      `Origem não permitida pelo CORS, ${origin}`,
    );
    return callback(corsError);
  }, // origens permitidas e tratamento com msg de erro, caso não

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // permite envio de cookies/autenticação (caso o projeto use
  // cookies httpOnly, ao invés do armazenamento do JWT token no localStorage)
};

// Aplica CORS com opções específicas
app.use(cors(corsOptions));

// Trata requisições preflight (OPTIONS) para qualquer rota
// Regex /.*/ para qlqr caminho, evita erro path-to-regex que ocorre com '*' ou '(.*)'
// em versões recentes do Express
app.options(/.*/, cors(corsOptions));

// -------
// Helmet
// -------

// Depois do CORS, para não sobrescrever cabeçalhos

// Configuração com opções específicas

// 'contentSecurityPolicy' espera um array de strings para cada diretiva (como connectSrc)
// '.map()' com 'trim()' para ajuste de formatação pq no .env é armazenado como única
// string, para converter em array
const connectSrcUrls = process.env.CSP_CONNECT_SRC.split(',').map((url) =>
  url.trim(),
);

// Baseado em diretivas definidas no frontend para CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...connectSrcUrls],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);

// Para 'Referrer Policy': o cabeçalho 'Referer' normalmente informa a URL da página
// anterior quando vc navega para outra, 'same-origin' envia o referer apenas para o
// mesmo domínio
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

// -----------
// Rate limit
// -----------

// Depois do CORS, para não bloquear preflight

// Aplica o limitador de taxa
app.use(limiter);

// ------------
// Body-parser
// ------------

// Para analisar application/json
app.use(express.json());

// --------------------
// Logs (solicitações)
// --------------------

// Habilita o registrador de solicitações
app.use(requestLogger);

// --------
// Rotas
// --------

// Rota principal
app.use('/', routes);

// -------------
// Logs (erros)
// -------------

// Habilita o registrador de erros
app.use(errorLogger);

// ----------------------
// Tratamento de erros
// ----------------------

// Tratamento centralizado de erros do Celebrate
app.use(errors());

// Tratamento para rotas não encontradas
app.use(notFoundPage);

// Tratamento centralizado de erros
app.use(handleError);

// ---------------------------
// Conexão com banco de dados
// ---------------------------

// Conecta ao servidor Mongo DB
mongoose
  .connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
  .then(() => {
    console.log(
      `Conectado ao Mongo DB: o nome do banco de dados é ${process.env.DB_NAME}`,
    );
  })
  .catch((err) => {
    console.log(`Erro ao conectar com Mongo DB: ${err}`);
    process.exit(1); // para evitar app rodando sem DB
  });

// ----------------------
// Conexão com servidor
// ----------------------

// Sobe o servidor da aplicação
// Configura porta a ser ouvida, apenas se não estiver executando no modo de teste
// Para Supertest
if (process.env.NODE_ENV !== 'test') {
  app.listen(process.env.PORT, () => {
    console.log(`Aplicativo escutando na porta: ${process.env.PORT}`);
  });
}

// Exporta app, para uso no Supertest
module.exports = app;
