const articlesRouter = require('express').Router(); // cria um roteador ('/articles')

const {
  getUserArticles,
  postUserArticles,
  deleteUserArticles,
} = require('../controllers/articles');

const celebrateForPost = require('../middlewares/celebrates/articles/celebrateForPost');
const celebrateForDelete = require('../middlewares/celebrates/articles/celebrateForDelete');

// Lista todos os artigos salvos pelo usuário autenticado
articlesRouter.get('/', getUserArticles);

// Cria (ou associa) um artigo ao usuário
articlesRouter.post('/', celebrateForPost, postUserArticles);

// Remove o artigo salvo pelo usuário
articlesRouter.delete('/:articleId', celebrateForDelete, deleteUserArticles);

module.exports = articlesRouter;
