// --------
// Dotenv
// --------

// Carrega dotenv antes de qualquer uso de process.env
const dotenv = require('dotenv');

// Configura leitura do arquivo dinamicamente, de acordo com o ambiente
const resultEnv = dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
});

// Log sobre .env, apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  if (resultEnv.error) {
    console.warn(
      `Nenhum arquivo .env.${process.env.NODE_ENV} encontrado — usando fallbacks`,
    );
  } else {
    console.log(`Arquivo env carregado: .env.${process.env.NODE_ENV}`);
  }
}

// Aplica fallbacks (dev/test) e valida envs obrigatórias (produção)
require('./utils/configEnv')();

// --------------------
// Importações do app
// --------------------

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

const app = express();

// ------
// CORS
// ------

// Fallback seguro caso a env não exista
const allowedCors = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (Postman, mobile, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedCors.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new ForbiddenError(
      `Origem não permitida pelo CORS, ${origin}`,
    );
    return callback(corsError);
  },

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

// Fallback seguro para CSP
const connectSrcUrls = (process.env.CSP_CONNECT_SRC || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

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

// 'Referrer Policy': o cabeçalho 'Referer' normalmente informa a URL da página
// anterior quando vc navega para outra, 'same-origin' envia o referer apenas para o
// mesmo domínio
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

// -----------
// Rate limit
// -----------

// Depois do CORS, para não bloquear preflight

app.use(limiter);

// ------------
// Body-parser
// ------------

app.use(express.json());

// --------------------
// Logs (requests)
// -------------------

app.use(requestLogger);

// --------
// Rotas
// --------

// Rota teste CSP
if (process.env.NODE_ENV === 'development') {
  app.get('/csp-test', (req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html>
        <body>
          <h1>Teste de CSP</h1>
          <script src="/csp-test.js"></script>
        </body>
      </html>
    `);
  });

  // Fetch já usa cors por padrão, mas mantido 'mode' por clareza didática
  app.get('/csp-test.js', (req, res) => {
    res.type('application/javascript').send(`
      fetch('http://localhost:3005/test', { mode: 'cors' })
        .then(() => {
          console.log('TESTE DE CSP: CSP OK + REQUEST OK');
        })
        .catch((e) => {
          console.log('Se for erro de CONTENT SECURITY POLICY > TESTE DE CSP: BLOCKED > O CSP bloqueou, pois a URL não está na lista de permissão. Se ERR_CONNECTION_REFUSED > TESTE DE CSP: OK > O erro é de rede, na request: CSP permitiu a conexão, browser tentou conectar, não existe servidor em localhost:3005 (porta fechada) e o sistema recusou a conexão.');
        });
    `);
  });
}

// Rota principal
app.use('/', routes);

// --------------
// Logs (errors)
// --------------

app.use(errorLogger);

// ----------------------
// Tratamento de erros
// ----------------------

app.use(errors());
app.use(notFoundPage);
app.use(handleError);

// -----------------
// Banco de dados
// -----------------

mongoose

  .connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
  .then(() => {
    console.log(
      `Conectado ao Mongo DB: o nome do banco de dados é ${process.env.DB_NAME}`,
    );
  })
  .catch((err) => {
    console.log(`Erro ao conectar com Mongo DB: ${err}`);

    // Em teste, erros devem falhar testes, não matar processos
    // Jest captura o erro, o teste falha corretamente e o stacktrace
    // permanece completo pq o erro é lançado antes do '.exit'
    if (process.env.NODE_ENV === 'test') {
      throw err;
    }

    // Para evitar app rodando sem DB
    process.exit(1);
  });

// -----------
// Servidor
// -----------

// Sobe o servidor da aplicação
// Configura porta a ser ouvida, apenas se não estiver executando no modo de teste
if (process.env.NODE_ENV !== 'test') {
  app.listen(process.env.PORT, () => {
    console.log(`Aplicativo escutando na porta: ${process.env.PORT}`);
  });
}

// Exporta app, para uso no Supertest
module.exports = app;
