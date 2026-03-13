const rateLimit = require('express-rate-limit');
const RateLimitError = require('../errors/RateLimitError');

// Limita o número de requisições por IP em um intervalo de tempo

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: process.env.RATE_LIMIT_MAX, // máximo de requisições por IP
  handler: (req, res, next) => {
    // Encaminha erro customizado para o middleware central de erros
    next(
      new RateLimitError(
        'Muitas solicitações recebidas, tente novamente mais tarde.',
      ),
    );
  },
});

module.exports = limiter;
