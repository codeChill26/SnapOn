class CustomError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode; // Unified status and statusCode representation
    this.code = code;
    this.details = details;
    this.errors = details; // Backwards compatibility alias for details
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
