// Setup super-test
const supertest = require('supertest');
// Setup express test service
const app = require('../server');
// Setup request to test
const request = supertest(app);

const User = require('../models/user');
const Article = require('../models/article');
const userPayload = require('./fixtures/userPayload');

describe('Suíte de testes de integração (DB + HTTP): article', () => {
  // Banco de dados: conexão (setup) e desconexão (teardown) globais, em jest.setup.js +
  // configuração do jest.config.js

  // Adiciona dados de teste ao banco de dados -> testa -> exclui os dados de teste

  beforeEach(async () => {
    // Cleanup: limpa as coleçôes de teste, de usuário e artigo
    await Promise.all([Article.deleteMany({}), User.deleteMany({})]);
  });

  // Obj de configuração para dados de criação de artigo teste
  const toSavePayload = {
    tag: 'javascript',
    title: 'What AI Sees When It Visits Your Website (And How To Fix It)',
    description: `Learn how AI bots interpret your content and affect customer perceptions.
      Optimize your website for the evolving world of AI.\nThe post What AI Sees When
      It Visits Your Website (And How To Fix It) appeared first on Search Engine Journal.`,
    publishedAt: '2026-03-02T06:00:40Z',
    source: 'Search Engine Journal',
    url: 'https://www.searchenginejournal.com/how-ai-crawls-sites-scrunchai-spa/568166/',
    urlToImage:
      'https://cdn.searchenginejournal.com/wp-content/uploads/2026/02/featured-116.png',
  };

  // Testes de solicitações HTTP (endpoints)
  // Inicia o teste -> conecta ao servidor -> executa os testes -> desconecta do servidor
  // -> conclui os testes
  // SuperTest se encarrega de conectar-se ao servidor e a partir dele

  // Endpoint de registro de artigo → seeds: usuário cadastrado e logado
  describe('POST: /articles', () => {
    let userId;
    let token;

    beforeEach(async () => {
      // seed signup
      const registration = await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      userId = registration.body.user._id;

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

    // Artigo ainda não cadastrado > retorna owner, devido .create() no controlador
    test('cria artigo, escrevendo dados no banco, e retorna 201 com json', async () => {
      const res = await request
        .post('/articles')
        .send(toSavePayload)
        .set('Accept', 'application/json')
        .set('authorization', `Bearer ${token}`);

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.statusCode).toBe(201);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          keyword: toSavePayload.tag,
          title: toSavePayload.title,
          text: toSavePayload.description,
          source: toSavePayload.source,
          link: toSavePayload.url,
          image: toSavePayload.urlToImage,
          owner: expect.arrayContaining([
            expect.stringMatching(/^[a-f\d]{24}$/i),
          ]),
          _id: expect.stringMatching(/^[a-f\d]{24}$/i),
        }),
      );

      // Valida date normalizando
      expect(new Date(res.body.date).toISOString()).toBe(
        new Date(toSavePayload.publishedAt).toISOString(),
      );

      // Valida owner com o id do usuário (capturado no seed signup)
      expect(res.body.owner).toContainEqual(userId);
    });

    // Artigo já cadastrado (salvo por outro usuário) > não retorna owner, pois não cria o
    // dado no banco, apenas atualiza
    test('atualiza artigo, adicionando _id em owner, e retorna 200 com json', async () => {
      // Dois usuários que salvam o mesmo artigo
      // Usuário A: seed do beforeEach do describe: usuário cadastrado e logado, com userId e token

      // Usuário B: cria um seed específico para o test(): segundo usuário cadastrado e
      // logado, apenas com tokenB
      const userPayloadB = {
        email: 'usuarioB@teste.com',
        password: 'usuariobteste123',
        name: 'UsuárioB Teste',
      };

      // Seed signup B
      await request
        .post('/signup')
        .send(userPayloadB)
        .set('Accept', 'application/json');

      // Seed signin B
      const loginB = await request
        .post('/signin')
        .send({
          email: userPayloadB.email,
          password: userPayloadB.password,
        })
        .set('Accept', 'application/json');

      const tokenB = loginB.body.token;

      // Salva o artigo pelo primeiro usuário
      const firstPost = await request
        .post('/articles')
        .send(toSavePayload)
        .set('Accept', 'application/json')
        .set('authorization', `Bearer ${token}`);

      // Valida pq articleIdA pode vir undefined e mascarar o problema, se por algum motivo
      // falhar e retornar erro/200
      expect(firstPost.statusCode).toBe(201);
      expect(firstPost.body._id).toMatch(/^[a-f\d]{24}$/i);

      const articleIdA = firstPost.body._id; // captura id do artigo salvo para verificação
      // com o segundo salvamento

      // Depois, salva o msm artigo pelo segundo usuário
      const res = await request
        .post('/articles')
        .send(toSavePayload)
        .set('Accept', 'application/json')
        .set('authorization', `Bearer ${tokenB}`);

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.statusCode).toBe(200); // não deve criar outro artigo

      // Deve manter dados principais
      expect(res.body).toMatchObject(
        expect.objectContaining({
          keyword: toSavePayload.tag,
          title: toSavePayload.title,
          text: toSavePayload.description,
          source: toSavePayload.source,
          link: toSavePayload.url,
          image: toSavePayload.urlToImage,
          _id: expect.stringMatching(articleIdA), // id do artigo precisa ser igual em
          // ambos salvamentos
        }),
      );

      // Valida date normalizado
      expect(new Date(res.body.date).toISOString()).toBe(
        new Date(toSavePayload.publishedAt).toISOString(),
      );
    });
  });
});
