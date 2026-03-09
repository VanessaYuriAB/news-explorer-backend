// Setup super-test
const supertest = require('supertest');
// Setup express test service
const app = require('../server');
// Setup request to test
const request = supertest(app);

const User = require('../models/user');
const userPayload = require('./fixtures/userPayload');
const errorMsg = require('../utils/errorsMsgs');

describe('Suíte de testes de integração (DB + HTTP): user', () => {
  // Banco de dados: conexão (setup) e desconexão (teardown) globais, em jest.setup.js +
  // configuração do jest.config.js

  // Adiciona dados de teste ao banco de dados -> testa -> exclui os dados de teste

  beforeEach(async () => {
    // Cleanup: limpa a coleção de teste de usuário
    await User.deleteMany({});
  });

  // Testes de solicitações HTTP (endpoints)
  // Inicia o teste -> conecta ao servidor -> executa os testes -> desconecta do servidor
  // -> conclui os testes
  // SuperTest se encarrega de conectar-se ao servidor e a partir dele

  // Endpoint de registro de usuário → banco vazio, sem seed
  describe('POST: /signup', () => {
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

    test('tenta criar usuário, mas retorna 409 - Conflict', async () => {
      // Primeiro cria um novo usuário no banco de testes (201)
      await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      // Depois, tenta criar o mesmo usuário (409)
      const error = await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(409);

      expect(error.body).toHaveProperty('message');
      expect(error.body.message).toEqual(errorMsg.msgOfErrorConflict);
    });
  });

  // Endpoint de login de usuário → usuário existente, seed de signup
  describe('POST: /signin', () => {
    beforeEach(async () => {
      await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');
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

    // Para testas dois cenários diferentes no msm teste, com mesmo retorno
    test.each([
      {
        name: 'senha errada',
        payload: { email: userPayload.email, password: 'senhaerrada123' },
      },
      {
        name: 'email inexistente',
        payload: {
          email: 'email@inexistente.com',
          password: userPayload.password,
        },
      },
    ])(
      'tenta logar, mas retorna 401 - Unauthorized: ($name)',
      async ({ payload }) => {
        const error = await request
          .post('/signin')
          .send(payload)
          .set('Accept', 'application/json');

        expect(error.headers['content-type']).toMatch(/json/);
        expect(error.statusCode).toBe(401);

        expect(error.body).toHaveProperty('message');
        expect(error.body.message).toEqual(
          errorMsg.msgOfErrorUnauthorizedLogin,
        );
      },
    );
  });

  // Endpoint de busca de usuário → usuário + token, seed de signup e signin
  describe('GET: /users/me', () => {
    let token;

    beforeEach(async () => {
      // seed signup
      await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      // seed signin
      const login = await request
        .post('/signin')
        .send({
          email: userPayload.email,
          password: userPayload.password,
        })
        .set('Accept', 'application/json');

      token = login.body.token;
    });

    test('retorna dados do usuário em json', async () => {
      const res = await request
        .get('/users/me')
        .set('authorization', `Bearer ${token}`);
      // No .set(), tanto faz Authorization ou authorization (HTTP headers são
      // case-insensitive)
      // No res.headers, o Node geralmente normaliza para minúsculo (por isso
      // costuma-se ler res.headers['content-type'], res.headers['authorization'])

      expect(res.statusCode).toBe(200); // 304 normalmente não entra (é cache de
      // navegador com ETag/If-None-Match), então não é preciso considerar

      expect(res.body).toMatchObject({
        user: {
          email: userPayload.email,
          name: userPayload.name,
          _id: expect.stringMatching(/^[a-f\d]{24}$/i), // a regex garante que é um
          // ObjectId válido
        }, // retorna _id, email e nome
      });
    });

    // Retornos do Celebrate/Joi: sem header Authorization
    test('retorna 400 (Celebrate) - Bad Request: sem header Authorization', async () => {
      const error = await request.get('/users/me');

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(400);

      expect(error.body).toMatchObject({
        message: expect.stringMatching('Validation failed'),
      });
    });

    // Retornos do Celebrate/Joi: formato inválido, Authorization não bate regex
    test('retorna 400 (Celebrate) - Bad Request: formato inválido, Authorization não bate regex', async () => {
      const invalidToken = token.replace(/\./g, ''); // "aaabbbccc" (sem pontos)

      const error = await request
        .get('/users/me')
        .set('authorization', `Bearer ${invalidToken}`);

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(400);

      expect(error.body).toMatchObject({
        message: expect.stringMatching('Validation failed'),
      });
    });

    // Formato válido mas token inválido: Authorization bate regex, mas token inválido
    // → 401 (Auth)
    test('retorna 401 - Unauthorized', async () => {
      const error = await request
        .get('/users/me')
        .set('authorization', `Bearer a.b.c`);

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(401);

      expect(error.body).toMatchObject({
        message: expect.stringMatching(errorMsg.msgOfErrorUnauthorizedToken),
      });
    });

    // Token válido mas usuário inexistente → 404 (Controller/orFail)
    test('retorna 404 - Not Found', async () => {
      // Deleta o cadastro do usuário criado no seed de signup
      await User.deleteOne({ email: userPayload.email });

      const error = await request
        .get('/users/me')
        .set('authorization', `Bearer ${token}`);

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(404);

      expect(error.body).toMatchObject({
        message: expect.stringMatching(errorMsg.msgOfErrorNotFoundUser),
      });
    });
  });
});
