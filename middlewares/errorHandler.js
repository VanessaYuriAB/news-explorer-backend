const handleError = (err, req, res, next) => {
  // Erros de conversão ou validação do Mongoose → Bad Request
  if (err.name === 'CastError') {
    return res.status(400).send({ message: '_id inválido ou incompleto' });
  }

  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .send({ message: 'Dado(s) inválido(s) ou inexistente(s)' });
  }

  // Erro de configuração do servidor (ex.: variáveis de ambiente ausentes)
  if (err.name === 'ConfigError') {
    return res
      .status(500)
      .send({ message: `Erro de configuração do servidor: ${err.message}` });
  }

  // Erros customizados usam statusCode definido na própria classe
  // Ou 500, como padrão definido abaixo
  const { statusCode = 500, message = 'Ocorreu um erro no servidor' } = err;

  return res.status(statusCode).send({ message });
};

module.exports = handleError;
