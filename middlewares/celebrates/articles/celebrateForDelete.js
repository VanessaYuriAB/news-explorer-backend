const { celebrate, Joi } = require('celebrate');

const celebrateForDelete = celebrate({
  params: Joi.object().keys({
    // O nome deve bater com o parâmetro definido na rota (/:articleId)
    // .length() valida ObjectId do MongoDB
    articleId: Joi.string().required().hex().length(24),
  }),
});

module.exports = celebrateForDelete;
