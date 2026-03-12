const mongoose = require('mongoose');

// Setup global do Mongoose : para o teste de banco de dado

// Conecta 1 vez por execução de testes (setup global)
// Desconecta 1 vez no final (teardown global)
// Em cada teste/describe: limpa coleções com deleteMany
// Jest recomenda usar Global Setup/Teardown para MongoDB
// Nenhum teste desconecta o banco “no meio” de outro, evitando corridas (paralelismo)

// Como o server.js já faz mongoose.connect(...) sempre que ele é importado nos arquivos
// de testes, quando o teste faz 'app = require('../server');' a conexão já é iniciada
// automaticamente usando as variáveis do .env.test (porque NODE_ENV=test carrega .env.test
// no seu loader) > Então não é preciso chamar mongoose.connect() de novo no arquivo de
// configuração do banco de dados para teste, em beforeAll(), apenas aguardar a conexão
beforeAll(async () => {
  // Garante que a conexão abriu antes de rodar os testes
  if (mongoose.connection.readyState === 0) {
    await mongoose.connection.asPromise(); // mongoose v6+
  }
});

afterAll(async () => {
  // Desconecta do banco de dados após rodar todos os testes
  await mongoose.disconnect();
});
