export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 400, 'Datos inválidos', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED') {
    super(code, 401, 'No autenticado')
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('INSUFFICIENT_ROLE', 403, 'Rol sin permiso para esta operación')
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super('NOT_FOUND', 404, `${resource} no encontrado`)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, details?: unknown) {
    super(code, 409, 'Conflicto', details)
  }
}

export class PayloadTooLargeError extends AppError {
  constructor() {
    super('PAYLOAD_TOO_LARGE', 413, 'El archivo supera el tamaño máximo')
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 415, 'El archivo no es una imagen')
  }
}