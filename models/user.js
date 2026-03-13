const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const Unauthorized = require('../errors/UnauthorizedError');
const { msgOfErrorUnauthorizedLogin } = require('../utils/errorsMsgs');

// Schema de usuário
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => validator.isEmail(v),
      message: (props) => `${props.value} não é um email válido!`,
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    match: /^[^<>]+$/, // bloqueia HTML básico por segurança ('<' e '>')
    select: false, // não retorna hash de senha por padrão nas consultas (queries: find,
    // findOne, findById) - mas métodos como create, save, new Model() não passam por
    // projeção e o campo é retornado na requisição feita
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 30,
    match: /^[^<>]+$/, // bloqueia HTML básico por segurança ('<' e '>')
  },
});

// Remove campos sensíveis/irrelevantes nas respostas
// Transforma schema, removendo os campos 'password' e '__v'
// 'password' é retornado em /signup pq passa por .create() para hashear a senha
// '__v' é criado pelo próprio Mongo DB e não é usado no projeto
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    // As regras do eslint foram desativadas abaixo, pq a intenção é realmente alterar
    // o objeto

    // eslint-disable-next-line no-param-reassign
    delete ret.password;

    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

// Autenticação por credenciais sem revelar se o e-mail existe (evita enumeração)
userSchema.statics.findUserByCredentials = async function findUserByCredentials(
  email,
  password,
) {
  // `this` refere-se ao modelo de usuário e '.select()' retorna o campo na pesquisa
  const isUserInDB = await this.findOne({ email })
    .select('+password')
    .orFail(() => {
      throw new Unauthorized(`${msgOfErrorUnauthorizedLogin}`);
    });

  const isMatched = await bcrypt.compare(password, isUserInDB.password);

  if (!isMatched) {
    throw new Unauthorized(`${msgOfErrorUnauthorizedLogin}`);
  }

  return isUserInDB;
};

// Exporta o modelo, criado a partir do esquema
module.exports = mongoose.model('user', userSchema);
