// Documento não encontrado (DocumentNotFoundError): o Mongoose não localiza o recurso
// solicitado, .orFail() lança 'Não encontrado'

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.name = 'NotFoundError';
  }
}

module.exports = NotFoundError;
