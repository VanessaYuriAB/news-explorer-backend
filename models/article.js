const mongoose = require('mongoose');
const validator = require('validator');

// Schema de artigos
const articleSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    match: /^[^<>]+$/, // bloqueia HTML básico por segurança ('<' e '>')
  },
  title: {
    type: String,
    required: false,
    default: null,
  },
  text: {
    type: String,
    required: false,
    default: null,
  },
  date: {
    type: Date,
    required: false,
    default: null,
  },
  source: {
    type: String,
    required: false,
    default: null,
  },
  link: {
    type: String,
    required: true,
    validate: {
      validator: (v) => validator.isURL(v),
      message: (props) => `${props.value} não é um link válido!`,
    },
  },
  image: {
    type: String,
    required: false,
    default: null,
    validate: {
      validator: (v) => {
        if (!v) {
          return true;
        }
        return validator.isURL(v);
      },
      message: (props) => {
        return `${props.value} não é um link válido!`;
      },
    },
  },
  owner: {
    type: [mongoose.Schema.Types.ObjectId], // permite múltiplos usuários por artigo
    ref: 'user',
    default: [],
    select: false, // em queries (find, findOne, findById), o campo é retornado apenas
    // quando explicitamente selecionado - create, save, new Model() não passam por
    // projeção e, após o método, o campo é retornado na requisição feita
  },
});

// Exporta o modelo, criado a partir do esquema
module.exports = mongoose.model('article', articleSchema);
