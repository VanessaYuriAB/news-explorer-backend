const mongoose = require('mongoose');

// Setup super-test
const supertest = require('supertest');
// Setup express test service
const app = require('../server');
// Setup request to test
const request = supertest(app);

const User = require('../models/user');

describe('Suíte de testes (DB + HTTP)', () => {
  // Teste de banco de dados
  // Adiciona dados de teste ao banco de dados -> testa -> exclui os dados de teste

  // Como o server.js já faz mongoose.connect(...) sempre que ele é importado, quando o
  // teste faz 'app = require('../server');' a conexão já é iniciada automaticamente usando
  // as variáveis do .env.test (porque NODE_ENV=test carrega .env.test no seu loader) >
  // Então não é preciso chamar mongoose.connect() de novo no arquivo de teste, em beforeAll(), apenas aguardar conexão
  beforeAll(async () => {
    // Garante que a conexão abriu antes de rodar os testes
    if (mongoose.connection.readyState === 0) {
      await mongoose.connection.asPromise(); // mongoose v6+
    }
  });

  afterAll(async () => {
    // Limpa a coleção de teste de usuário
    await User.deleteMany({});

    // Desconecta do banco de dados
    await mongoose.disconnect();
  });

  // Obj de configuração para dados de usuário teste
  const userPayload = {
    email: 'usuario@teste.com',
    password: 'usuarioteste123',
    name: 'Usuário Teste',
  };

  // Testes de solicitações HTTP (endpoints)
  // Inicia o teste -> conecta ao servidor -> executa os testes -> desconecta do servidor
  // -> conclui os testes
  // SuperTest se encarrega de conectar-se ao servidor e a partir dele

  // Endpoint de registro de usuário → banco vazio
  describe('POST: /signup', () => {
    beforeEach(async () => {
      // Limpa coleção
      await User.deleteMany({});
    });

    test('cria usuário, escrevendo dados no banco, e retorna json', async () => {
      const res = await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.statusCode).toBe(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject(
        expect.objectContaining({
          email: userPayload.email,
          name: userPayload.name,
          _id: expect.any(String),
        }),
      );
      expect(res.body.user._id).toHaveLength(24); // por ser um ObjectId do Mongo DB
      expect(res.body.user.password).toBeUndefined(); // senha não é retornada, msm em hash
    });
  });

  // Endpoint de login de usuário → usuário existente
  describe('POST: /signin', () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await request.post('/signup').send(userPayload);
    });

    test('loga usuário e retorna token JWT em json', async () => {
      const res = await request
        .post('/signin')
        .send({
          email: userPayload.email,
          password: userPayload.password,
        })
        .set('Accept', 'application/json');

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.statusCode).toBe(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toEqual(
        expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      );
    });
  });

  // Endpoint de busca de usuário → usuário + token
  describe('GET: /users/me', () => {
    let token;

    beforeEach(async () => {
      await User.deleteMany({});
      await request.post('/signup').send(userPayload);

      const login = await request.post('/signin').send({
        email: userPayload.email,
        password: userPayload.password,
      });

      token = login.body.token;
    });

    test('retorna dados do usuário em json', async () => {
      const res = await request
        .get('/users/me')
        .set('authorization', `Bearer ${token}`);
      // No .set(), tanto faz Authorization ou authorization (HTTP headers são
      // case-insensitive)
      // No res.headers, o Node geralmente normaliza para minúsculo (por isso costuma-se
      // ler res.headers['content-type'], res.headers['authorization'])

      expect(res.status).toEqual(200); // 304 normalmente não entra (é cache de navegador
      // com ETag/If-None-Match), então não é preciso considerar

      expect(res.body).toMatchObject({
        user: {
          email: userPayload.email,
          name: userPayload.name,
          _id: expect.stringMatching(/^[a-f\d]{24}$/i), // a regex garante que é um ObjectId válido
        }, // retorna _id, email e nome
      });
    });
  });
});
