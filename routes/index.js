// Cria um roteador para a rota principal
const router = require('express').Router();

const celebrateForSignup = require('../middlewares/celebrates/celebrateForSignup');
const celebrateForSignin = require('../middlewares/celebrates/celebrateForSignin');
const celebrateForAuth = require('../middlewares/celebrates/celebrateForAuth');

const handleAuth = require('../middlewares/authHandler');

const { getUser, createUser, loginUser } = require('../controllers/users');
const articlesRouter = require('./articles');

// Arquivo para todas as rotas do app
// Exceto rota de teste de CSP

// Rotas públicas
router.post('/signup', celebrateForSignup, createUser);
router.post('/signin', celebrateForSignin, loginUser);

// Rotas privadas (exigem autenticação via JWT
router.get('/users/me', celebrateForAuth, handleAuth, getUser);
router.use('/articles', celebrateForAuth, handleAuth, articlesRouter);

// Exporta o roteador para a rota principal, importado como 'routes'
module.exports = router;
