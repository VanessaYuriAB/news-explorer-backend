const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const Unauthorized = require('../errors/UnauthorizedError');
const { msgOfErrorUnauthorizedLogin } = require('../utils/errorsMsgs');

// Cria o esquema para usuário
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
    match: /^[^<>]+$/, // regex para segurança básica, '<' e '>' não são permitidos
    select: false, // o banco de dados não devolve esse campo (hash de senha) por padrão > apenas em queries, qdo feito find, findOne, findById, não inclui o campo por padrão > create, save, new Model() não passam por projeção e, após o método, o campo é retornado na requisição feita
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 30,
    match: /^[^<>]+$/, // regex para segurança básica, '<' e '>' não são permitidos
  },
});

// Transforma schema, removendo os campos 'password' e '__v'
// 'password' é retornado em /signup pq passar por .create() para hashear a senha
// '__v' é criado pelo próprio Mongo DB e não é usado no projeto
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    // Aqui, é para alterar o objeto mesmo, por isso as regras do eslint
    // foram desativadas abaixo

    // eslint-disable-next-line no-param-reassign
    delete ret.password;

    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

// Método personalizado do Mongoose, definido na propriedade statics (estáticos) do
// esquema, para encontrar um usuário pelas credenciais: uso no controlador de login
userSchema.statics.findUserByCredentials = async function findUserByCredentials(
  email,
  password,
) {
  // Verificação do cadastro, `this` refere-se ao modelo de usuário, '.select()' retorna
  // o campo na pesquisa, pois o padrão do schema é 'select: false'
  const isUserInDB = await this.findOne({ email })
    .select('+password')
    .orFail(() => {
      // Se e-mail não for encontrado, retorna erro 401 pq o método é para verificação de
      // permissão para login: para não revelar se o e-mail existe ou não, por questão de
      // segurança: evita enumeration attacks (ataques que descobrem quais e-mails estão
      // cadastrados)
      throw new Unauthorized(`${msgOfErrorUnauthorizedLogin}`);
    });

  // Se encontrado, compara o hash da senha fornecida com a salva no banco de dados
  const isMatched = await bcrypt.compare(password, isUserInDB.password);

  // Se não coincidir, retorna 401
  if (!isMatched) {
    throw new Unauthorized(`${msgOfErrorUnauthorizedLogin}`);
  }

  // Se coincidir a autenticação foi bem-sucedida: retorna o objeto do usuário no
  // banco de dados
  return isUserInDB;
};

// Cria o modelo a partir do esquema e exporta-o
module.exports = mongoose.model('user', userSchema);
