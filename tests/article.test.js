// Setup super-test
const supertest = require('supertest');
// Setup express test service
const app = require('../server');
// Setup request to test
const request = supertest(app);

const User = require('../models/user');
const Article = require('../models/article');
const { userPayload, anotherUserPayload } = require('./fixtures/usersPayloads');
const errorsMsgs = require('../utils/errorsMsgs');

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

  // Geração de seed de artigo para describes de erros
  const createSeeds = async () => {
    // Seeds de autenticação
    const registration = await request
      .post('/signup')
      .send(userPayload)
      .set('Accept', 'application/json');

    expect(registration.headers['content-type']).toMatch(/json/);
    expect(registration.statusCode).toBe(201);
    expect(registration.body).toHaveProperty('user');

    const login = await request
      .post('/signin')
      .send({
        email: userPayload.email,
        password: userPayload.password,
      })
      .set('Accept', 'application/json');

    expect(login.headers['content-type']).toMatch(/json/);
    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty('token');

    // Seed de artigo
    const article = await request
      .post('/articles')
      .send(toSavePayload)
      .set('Accept', 'application/json')
      .set('authorization', `Bearer ${login.body.token}`);

    expect(article.headers['content-type']).toMatch(/json/);
    expect(article.statusCode).toBe(201);
    expect(article.body._id).toMatch(/^[a-f\d]{24}$/i);

    return { article, login };
  };

  // Testes de solicitações HTTP (endpoints)
  // Inicia o teste -> conecta ao servidor -> executa os testes -> desconecta do servidor
  // -> conclui os testes
  // SuperTest se encarrega de conectar-se ao servidor e a partir dele

  // Com erros de validação, Celebrate/Joi (400)
  describe('Retornam erros de validação, 400 - Bad Request (Celebrate/Joi)', () => {
    // Função genérica para todos endpoints
    async function returnBadRequest(testRequest) {
      const error = await testRequest;

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(400);

      expect(error.body).toMatchObject({
        message: expect.stringMatching('Validation failed'),
      });
    }

    // Sem header Authorization
    describe('Retornam 400, sem header Authorization', () => {
      // POST
      test('POST /articles', async () => {
        expect.assertions(3);

        await returnBadRequest(
          request
            .post('/articles')
            .send(toSavePayload)
            .set('Accept', 'application/json'),
        );
      });

      // GET
      test('GET /articles', async () => {
        expect.assertions(3);

        await returnBadRequest(request.get('/articles'));
      });

      // DELETE
      test('DELETE /articles/:articleId', async () => {
        expect.assertions(12);

        // Seed de artigo
        const { article } = await createSeeds();

        await returnBadRequest(request.delete(`/articles/${article.body._id}`));
      });
    });

    // Formato inválido, Authorization não bate regex
    describe('Retornam 400, formato inválido, Authorization não bate regex', () => {
      // POST
      test('POST /articles', async () => {
        expect.assertions(3);

        await returnBadRequest(
          request
            .post('/articles')
            .send(toSavePayload)
            .set('Accept', 'application/json')
            .set('authorization', `Bearer`),
        );
      });

      // GET
      test('GET /articles', async () => {
        expect.assertions(3);

        await returnBadRequest(
          request.get('/articles').set('authorization', `Bearer`),
        );
      });

      // DELETE
      test('DELETE /articles/:articleId', async () => {
        expect.assertions(12);

        // Seed de artigo
        const { article } = await createSeeds();

        await returnBadRequest(
          request
            .delete(`/articles/${article.body._id}`)
            .set('authorization', `Bearer`),
        );
      });
    });

    // Sem dados do body
    // Ex: com token, mas tag com string vazia no post

    // Params inválido, no DELETE
    test('DELETE /articles/:articleId com params inválido', async () => {
      expect.assertions(12);

      // Seed
      const { login } = await createSeeds();

      const badArticleId = '123';

      await returnBadRequest(
        request
          .delete(`/articles/${badArticleId}`)
          .set('authorization', `Bearer ${login.body.token}`),
      );
    });
  });

  // Com erros de autenticação (401)
  describe('Retornam erros de autenticação, 401 - Unauthorized', () => {
    const invalidToken = `Bearer a.b.c`;

    // Função genérica para todos endpoints
    async function returnUnauthorized(testRequest) {
      const error = await testRequest;

      expect(error.headers['content-type']).toMatch(/json/);
      expect(error.statusCode).toBe(401);

      expect(error.body).toMatchObject({
        message: expect.stringMatching(errorsMsgs.msgOfErrorUnauthorizedToken),
      });
    }

    // no POST
    test('POST /articles retorna 401 com token inválido', async () => {
      expect.assertions(3);

      await returnUnauthorized(
        request
          .post('/articles')
          .send(toSavePayload)
          .set('Accept', 'application/json')
          .set('authorization', invalidToken),
      );
    });

    // no GET
    test('GET /articles retorna 401 com token inválido', async () => {
      expect.assertions(3);

      await returnUnauthorized(
        request.get('/articles').set('authorization', invalidToken),
      );
    });

    // no DELETE
    test('DELETE /articles/:articleId retorna 401 com token inválido', async () => {
      expect.assertions(12);

      // Seed de artigo
      const { article } = await createSeeds();

      await returnUnauthorized(
        request
          .delete(`/articles/${article.body._id}`)
          .set('authorization', invalidToken),
      );
    });
  });

  // Seeds de auth: usuário cadastrado e logado > envolvendo todos os conjuntos de testes
  describe('Rotas protegidas (precisa estar logado)', () => {
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

    // Endpoint de registro de artigo → com seeds de auth
    describe('POST: /articles', () => {
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
            // date: toSavePayload.publishedAt, // normalizado abaixo
            source: toSavePayload.source,
            link: toSavePayload.url,
            image: toSavePayload.urlToImage,
            owner: expect.arrayContaining([
              expect.stringMatching(/^[a-f\d]{24}$/i),
            ]),
            _id: expect.stringMatching(/^[a-f\d]{24}$/i),
          }),
        );

        // Valida date normalizando > pq passa por formatação no front
        expect(new Date(res.body.date).toISOString()).toBe(
          new Date(toSavePayload.publishedAt).toISOString(),
        );

        // Valida owner com o id do usuário (capturado no seed signup)
        expect(res.body.owner).toContainEqual(userId);
      });

      // Artigo já cadastrado (salvo por outro usuário) > não retorna owner, pois não cria o
      // dado no banco, apenas atualiza
      test('atualiza artigo, adicionando _id em owner, e retorna 200 com json', async () => {
        // Dois usuários salvam o mesmo artigo
        // Usuário A: seed do beforeEach do describe auth: usuário cadastrado e logado, com
        // userId e token

        // Usuário B: cria um seed específico para o test(): segundo usuário cadastrado e
        // logado, apenas com tokenB

        // Seed signup B
        const registrationB = await request
          .post('/signup')
          .send(anotherUserPayload)
          .set('Accept', 'application/json');

        const userIdB = registrationB.body.user._id;

        // Seed signin B
        const loginB = await request
          .post('/signin')
          .send({
            email: anotherUserPayload.email,
            password: anotherUserPayload.password,
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

        // Valida owner, testanto banco de dados
        const found = await Article.findById(articleIdA).select('+owner');
        expect(found.owner.length).toBe(2);

        const owners = found.owner.map(String);
        expect(owners).toEqual(expect.arrayContaining([userId, userIdB]));
      });
    });

    // Endpoint de busca de artigos → com seeds de auth e sem artigo
    describe('GET: /articles (sem artigos)', () => {
      test('lista de artigos do usuário vazia', async () => {
        // GET /articles com authorization
        const articles = await request
          .get('/articles')
          .set('authorization', `Bearer ${token}`);

        expect(articles.headers['content-type']).toMatch(/json/);
        expect(articles.statusCode).toBe(200);

        // Resposta, body, deve conter a propriedade especificada
        expect(articles.body).toHaveProperty('userArticles');

        // A propriedade do objeto de resposta deve ser um array vazio
        expect(articles.body.userArticles).toStrictEqual([]);
      });
    });

    // Seed de artigo: para testes que exigem usuário cadastrado, logado e artigo
    // previamente criado > envolvendo busca e delete de artigos do usuário
    describe('Com artigo cadastrado (seed article)', () => {
      // Seed de artigo: cria artigo com POST usando token
      let article;

      // Verificações do seed extraídas para função, devido erro acusado pelo ESLint:
      // jest/no-standalone-expect (falso positivo em hooks)
      function assertValidArticleResponse(seedArticle) {
        expect(seedArticle.headers['content-type']).toMatch(/json/);
        expect(seedArticle.statusCode).toBe(201);
        expect(seedArticle.body._id).toMatch(/^[a-f\d]{24}$/i);
      }

      beforeEach(async () => {
        article = await request
          .post('/articles')
          .send(toSavePayload)
          .set('Accept', 'application/json')
          .set('authorization', `Bearer ${token}`);

        // Garante seed article confiável (não mascara erro)
        assertValidArticleResponse(article);
      });

      // Endpoint de busca de artigos → com seeds de auth + artigo
      // Campo 'owner' não retorna na resposta da Api
      describe('GET: /articles', () => {
        test('lista artigos do usuário', async () => {
          // GET /articles com authorization
          const articles = await request
            .get('/articles')
            .set('authorization', `Bearer ${token}`);

          expect(articles.headers['content-type']).toMatch(/json/);
          expect(articles.statusCode).toBe(200);

          // Resposta, body, deve conter a propriedade especificada
          expect(articles.body).toHaveProperty('userArticles');

          // A propriedade do objeto deve ser um array de objetos
          expect(articles.body.userArticles).toEqual(
            expect.arrayOf(expect.any(Object)),
          );

          // Deve conter apenas um objeto
          expect(articles.body.userArticles.length).toBe(1);

          // Deve conter o artigo seedado
          expect(articles.body.userArticles[0]._id).toEqual(article.body._id);

          // O filtro por `owner`, no controlador, já garante que apenas artigos do
          // usuário autenticado sejam retornados, não sendo necessário validar o
          // campo `owner` diretamente no teste
        });
      });

      // Endpoint de delete de artigo → com seeds de auth + artigo
      // Campo 'owner' não retorna na resposta da Api
      describe('DELETE: /articles/:articleId', () => {
        // Se o artigo estiver salvo por apenas o usuário atual > deleta o artigo completo
        // Retorna deletedArticle
        test('deleta artigo e retorna 200 com json', async () => {
          // DELETE /articles/:articleId com authorization
          const deleted = await request
            .delete(`/articles/${article.body._id}`)
            .set('authorization', `Bearer ${token}`);

          expect(deleted.headers['content-type']).toMatch(/json/);
          expect(deleted.statusCode).toBe(200);

          expect(deleted.body).toHaveProperty('deletedArticle');
          expect(deleted.body.deletedArticle).toMatchObject(expect.any(Object));
          expect(deleted.body.deletedArticle._id).toEqual(article.body._id);

          // Valida e garante que o banco ficou no estado esperado, sem o cadastro do artigo
          const found = await Article.findById(article.body._id);
          expect(found).toBeNull();
        });

        // Se o artigo estiver salvo por mais de um usuário > apenas atualiza o campo owner
        // Retorna unsavedArticle
        test('atualiza artigo, removendo _id de owner, e retorna 200 com json', async () => {
          // Seeds existentes: usuário cadastrado e logado + artigo salvo
          // Seeds necessários: segundo usuário criado e logado + msm artigo salvo

          // Seed signup B
          const registrationB = await request
            .post('/signup')
            .send(anotherUserPayload)
            .set('Accept', 'application/json');

          const userIdB = registrationB.body.user._id;

          // Seed signin B
          const loginB = await request
            .post('/signin')
            .send({
              email: anotherUserPayload.email,
              password: anotherUserPayload.password,
            })
            .set('Accept', 'application/json');

          const tokenB = loginB.body.token;

          // Salva o msm artigo pelo segundo usuário
          const res = await request
            .post('/articles')
            .send(toSavePayload)
            .set('Accept', 'application/json')
            .set('authorization', `Bearer ${tokenB}`);

          expect(res.headers['content-type']).toMatch(/json/);
          expect(res.statusCode).toBe(200); // não deve criar outro artigo
          expect(res.body).toMatchObject(
            expect.objectContaining({
              _id: expect.stringMatching(article.body._id), // id do artigo precisa ser
              // igual em ambos salvamentos, portanto precisa ser o id do primeiro salvamento
              keyword: toSavePayload.tag,
              title: toSavePayload.title,
              text: toSavePayload.description,
              // date: toSavePayload.publishedAt, // generalizado abaixo, por causa de
              // formatação do projeto, no front
              date: expect.any(String),
              source: toSavePayload.source,
              link: toSavePayload.url,
              image: toSavePayload.urlToImage,
            }),
          );

          // DELETE /articles/:articleId com authorization
          // Des-salva pelo usuário padrão, o primeiro
          const unsaved = await request
            .delete(`/articles/${article.body._id}`)
            .set('authorization', `Bearer ${token}`);

          expect(unsaved.headers['content-type']).toMatch(/json/);
          expect(unsaved.statusCode).toBe(200);

          expect(unsaved.body).toHaveProperty('unsavedArticle');
          expect(unsaved.body.unsavedArticle).toMatchObject(expect.any(Object));
          expect(unsaved.body.unsavedArticle._id).toEqual(article.body._id);

          // Valida e garante que o banco ficou no estado esperado, com o cadastro do artigo,
          // mas sem o id do usuário em owner
          const found = await Article.findById(article.body._id).select(
            '+owner',
          );
          expect(found).not.toBeNull();

          // Aplica .map(String) em owner para converter ObjectId do mongoose em string
          // found.owner.map(id => id.toString());
          const owners = found.owner.map(String);
          expect(owners).toContain(userIdB); // id do usuário B
          expect(owners).not.toContain(userId); // removido usuário padrão
        });
      });
    });
  });
});
