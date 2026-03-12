// Setup super-test
const supertest = require('supertest');
// Setup express test service
const app = require('../../server');
// Setup request to test
const request = supertest(app);

const User = require('../../models/user');
const Article = require('../../models/article');
const {
  userPayload,
  anotherUserPayload,
} = require('../fixtures/usersPayloads');
const errorsMsgs = require('../../utils/errorsMsgs');

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

  // Geração de seed de login para describes de erros
  const createSeedLogin = async () => {
    // Cadastro
    const signup = await request
      .post('/signup')
      .send(userPayload)
      .set('Accept', 'application/json');

    // Guard: lança erro se o seed não voltar o status esperado
    if (signup.statusCode !== 201) {
      throw new Error(
        `Seed signup falhou em createSeedLogin: ${signup.statusCode} ${JSON.stringify(signup.body)}`,
      );
    }

    // Login
    const login = await request
      .post('/signin')
      .send({
        email: userPayload.email,
        password: userPayload.password,
      })
      .set('Accept', 'application/json');

    // Guard: lança erro se o seed não voltar o status esperado
    if (login.statusCode !== 200 || !login.body.token) {
      throw new Error(
        `Seed login falhou em createSeedLogin: ${login.statusCode} ${JSON.stringify(login.body)}`,
      );
    }

    return { login };
  };

  // Geração de seed de artigo para describes de erros
  const createSeedArticle = async () => {
    // Seed login
    // Extraído dentro da função pq quem chama createSeedArticle não chama o
    // createSeedLogin, portanto não duplica o cadastro
    const { login } = await createSeedLogin();

    const article = await request
      .post('/articles')
      .send(toSavePayload)
      .set('Accept', 'application/json')
      .set('authorization', `Bearer ${login.body.token}`);

    // Guard: lança erro se o seed não voltar o status esperado
    if (article.statusCode !== 201 || !article.body._id) {
      throw new Error(
        `Seed article falhou em createSeedArticle: ${article.statusCode} ${JSON.stringify(article.body)}`,
      );
    }

    return { article };
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
        expect.hasAssertions();

        // Seed de artigo
        const { article } = await createSeedArticle();

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
        expect.hasAssertions();

        // Seed de artigo
        const { article } = await createSeedArticle();

        await returnBadRequest(
          request
            .delete(`/articles/${article.body._id}`)
            .set('authorization', `Bearer`),
        );
      });
    });

    // Body inválido, no POST
    // Ex: com token, mas tag com string vazia no body
    test('POST /articles com body inválido', async () => {
      expect.hasAssertions();

      // Seed de login
      const { login } = await createSeedLogin();

      await returnBadRequest(
        request
          .post('/articles')
          .send({ ...toSavePayload, tag: '' }) // inválido
          .set('authorization', `Bearer ${login.body.token}`),
      );
    });

    // Params inválido, no DELETE
    test('DELETE /articles/:articleId com params inválido', async () => {
      expect.hasAssertions();

      // Seed de login
      const { login } = await createSeedLogin();

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
      expect.hasAssertions();

      // Seed de artigo
      const { article } = await createSeedArticle();

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
      // Seed signup
      const signup = await request
        .post('/signup')
        .send(userPayload)
        .set('Accept', 'application/json');

      // Guard: lança erro se o seed não voltar o status esperado
      if (signup.statusCode !== 201) {
        throw new Error(
          `Seed signup falhou no beforeEach de 'Rotas protegidas': ${signup.statusCode} ${JSON.stringify(signup.body)}`,
        );
      }

      userId = signup.body.user._id;

      // Seed signin
      const login = await request
        .post('/signin')
        .send({
          email: userPayload.email,
          password: userPayload.password,
        })
        .set('Accept', 'application/json');

      // Guard: lança erro se o seed não voltar o status esperado
      if (login.statusCode !== 200 || !login.body.token) {
        throw new Error(
          `Seed login falhou no beforeEach de 'Rotas protegidas': ${login.statusCode} ${JSON.stringify(login.body)}`,
        );
      }

      token = login.body.token;
    });

    // Geração de seed de login para segundo usuário
    const createSeedLoginB = async () => {
      // Signup B
      const signupB = await request
        .post('/signup')
        .send(anotherUserPayload)
        .set('Accept', 'application/json');

      if (signupB.statusCode !== 201 || !signupB.body.user._id) {
        throw new Error(
          `Seed signupB falhou em createSeedLoginB: ${signupB.statusCode} ${JSON.stringify(signupB.body)}`,
        );
      }

      const userIdB = signupB.body.user._id;

      // Signin B
      const loginB = await request
        .post('/signin')
        .send({
          email: anotherUserPayload.email,
          password: anotherUserPayload.password,
        })
        .set('Accept', 'application/json');

      if (loginB.statusCode !== 200 || !loginB.body.token) {
        throw new Error(
          `Seed loginB falhou em createSeedLoginB: ${loginB.statusCode} ${JSON.stringify(loginB.body)}`,
        );
      }

      const tokenB = loginB.body.token;

      return { userIdB, tokenB };
    };

    // Geração de seed de article pelo segundo usuário
    const createSeedArticleByUserB = async (tokenB) => {
      const articleB = await request
        .post('/articles')
        .send(toSavePayload)
        .set('Accept', 'application/json')
        .set('authorization', `Bearer ${tokenB}`);

      // Guard: lança erro se o seed não voltar o status esperado
      if (articleB.statusCode !== 200 || !articleB.body._id) {
        throw new Error(
          `Seed articleB falhou em createSeedArticleByUserB: ${articleB.statusCode} ${JSON.stringify(articleB.body)}`,
        );
      }

      return { articleB };
    };

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

        // Usuário B: seed da função genérica do describe auth: segundo usuário cadastrado e
        // logado, com userIdB e tokenB
        const { userIdB, tokenB } = await createSeedLoginB();

        // Seed article A: salva o artigo pelo primeiro usuário
        const articleByUserA = await request
          .post('/articles')
          .send(toSavePayload)
          .set('Accept', 'application/json')
          .set('authorization', `Bearer ${token}`);

        // Valida, pq articleA pode vir undefined e mascarar o problema, se por algum motivo
        // falhar e retornar erro/200
        expect(articleByUserA.statusCode).toBe(201);
        expect(articleByUserA.body._id).toMatch(/^[a-f\d]{24}$/i);

        const articleA = articleByUserA.body._id; // captura id do artigo salvo para verificação
        // no segundo salvamento, pelo usuário B

        // Seed article B: salva o msm artigo pelo segundo usuário
        const { articleB } = await createSeedArticleByUserB(tokenB);

        // Id do artigo precisa ser igual em ambos salvamentos
        expect(articleB.body).toMatchObject(
          expect.objectContaining({
            _id: expect.stringMatching(articleA),
          }),
        );

        // Valida owner, testando POST no banco de dados
        // Campo owner deve conter os dois Ids de usuários
        const found = await Article.findById(articleA).select('+owner');
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
        // Seed article
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
          const { userIdB, tokenB } = await createSeedLoginB();
          await createSeedArticleByUserB(tokenB);

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

          // Valida DELETE e garante que o banco ficou no estado esperado, com o cadastro
          // do artigo, mas sem o id do primeiro usuário em owner
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

        // Erros 403 e 404
        describe('Tenta deletar, mas retorna erro', () => {
          test('não permite deletar artigo de outro usuário (403)', async () => {
            // Seeds existentes: login + artigo
            // Login no beforeEach do describe auth
            // Artigo no beforeEach do describe article

            // Seed: segundo login
            const { tokenB } = await createSeedLoginB();

            // Deleta artigoA por usuário B
            const forbidden = await request
              .delete(`/articles/${article.body._id}`)
              .set('authorization', `Bearer ${tokenB}`);

            expect(forbidden.headers['content-type']).toMatch(/json/);
            expect(forbidden.statusCode).toBe(403);
            expect(forbidden.body).toMatchObject({
              message: errorsMsgs.msgOfErrorForbidden,
            });

            // Garante que artigo ainda existe no banco de dados
            const found = await Article.findById(article.body._id);
            expect(found).not.toBeNull();
          });

          test('não encontra cadastro do artigo (404)', async () => {
            // Seeds existentes: login + artigo
            // Login no beforeEach do describe auth
            // Artigo no beforeEach do describe article

            // Deleta o artigo antes de rodar o teste
            await Article.deleteOne({ _id: article.body._id });

            const notFound = await request
              .delete(`/articles/${article.body._id}`)
              .set('authorization', `Bearer ${token}`);

            expect(notFound.headers['content-type']).toMatch(/json/);
            expect(notFound.statusCode).toBe(404);
            expect(notFound.body).toMatchObject({
              message: errorsMsgs.msgOfErrorNotFoundArticle,
            });

            // Garante que artigo não existe no banco de dados
            const found = await Article.findById(article.body._id);
            expect(found).toBeNull();
          });
        });
      });
    });
  });
});
