const jwt = require('jsonwebtoken');
const UnauthorizedError = require('../errors/UnauthorizedError');
const { msgOfErrorUnauthorizedToken } = require('../utils/errorsMsgs');

const handleAuth = (req, res, next) => {
  const { authorization } = req.headers;

  // O formato do header já foi validado previamente pelo Celebrate

  const token = authorization.replace('Bearer ', ''); // extrai apenas o token, removendo
  // o prefixo 'Bearer '

  // Verificação da variával de ambiente JWT_SECRET é feita no início de server.js,
  // logo após carregar o dotenv

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnauthorizedError(`${msgOfErrorUnauthorizedToken}`);
  }

  // Disponibiliza os dados do usuário autenticado para os próximos middlewares
  req.user = payload;

  next();
};

module.exports = handleAuth;
