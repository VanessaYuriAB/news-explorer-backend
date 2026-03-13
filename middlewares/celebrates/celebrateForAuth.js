const { celebrate, Joi } = require('celebrate');

const celebrateForAuth = celebrate({
  headers: Joi.object()
    .keys({
      authorization: Joi.string()
        .required()
        .pattern(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/), // valida formato padrão do JWT
    })
    .unknown(true), // permite outros headers além do authorization, campos que não estão
  // listados no objeto de validação
});

module.exports = celebrateForAuth;
