// Conflito de índice único (e-mail duplicado), o MongoDB lança erro com code: 11000 → 409

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
    this.name = 'Conflict';
  }
}

module.exports = ConflictError;
