const { celebrate, Joi } = require('celebrate');

const celebrateForPost = celebrate({
  body: Joi.object().keys({
    // Validação baseada no payload enviado pelo front-end
    tag: Joi.string()
      .required()
      .pattern(/^[^<>]+$/), // bloqueia caracteres básicos de HTML ('<' e '>') por segurança
    title: Joi.string().allow(null).optional(),
    description: Joi.string().allow(null).optional(),
    publishedAt: Joi.date().allow(null).optional(),
    source: Joi.string().allow(null).optional(),
    url: Joi.string().uri().required(),
    urlToImage: Joi.string().uri().allow(null).optional(),
  }),
});

module.exports = celebrateForPost;
