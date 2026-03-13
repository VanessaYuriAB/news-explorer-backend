class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 500;
    this.name = 'ConfigError';
  }
}

module.exports = ConfigError;
