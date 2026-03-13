const { celebrate, Joi } = require('celebrate');

const celebrateForSignin = celebrate({
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string()
      .required()
      .min(8)
      .pattern(/^[^<>]+$/), // bloqueia caracteres básicos de HTML ('<' e '>') por segurança
  }),
});

module.exports = celebrateForSignin;
