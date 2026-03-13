const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const ConflictError = require('../errors/ConflictError');
const NotFoundError = require('../errors/NotFoundError');
const {
  msgOfErrorConflict,
  msgOfErrorNotFoundUser,
} = require('../utils/errorsMsgs');
const handleAsync = require('../utils/asyncHandlerControllers');

// Cria usuário (com verificação de e-mail duplicado e senha em hash)
const createUser = async (req, res) => {
  const isEmailDuplicate = await User.findOne({ email: req.body.email });

  if (isEmailDuplicate !== null) {
    throw new ConflictError(`${msgOfErrorConflict}`);
  }

  const hash = await bcrypt.hash(req.body.password, 10);

  const user = await User.create({
    email: req.body.email,
    password: hash,
    name: req.body.name,
  });

  return res.status(201).send({ user });
};

// Autentica usuário e retorna JWT
const loginUser = async (req, res) => {
  // Validação de credenciais via método estático do model
  const isUserInDB = await User.findUserByCredentials(
    req.body.email,
    req.body.password,
  );

  // Verificação da variável de ambiente JWT_SECRET para a chave secreta do método .sign()
  // é feita no início de server.js, logo após carregar o dotenv

  // Se ok, retorna o token
  const token = jwt.sign({ _id: isUserInDB._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.send({ token });
};

// Retorna dados do usuário logado
const getUser = async (req, res) => {
  // Sem verificação pois a rota só é chamada, caso esteja logado
  // O middleware de autenticação já garante que req.user exista, incluindo o campo _id

  const user = await User.findById(req.user._id).orFail(() => {
    throw new NotFoundError(`${msgOfErrorNotFoundUser}`);
  });

  res.send({ user });
};

// Exporta envolto na função wrapper utilitária para o fluxo de tratamento de erros
module.exports = {
  createUser: handleAsync(createUser),
  loginUser: handleAsync(loginUser),
  getUser: handleAsync(getUser),
};
