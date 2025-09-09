export enum ExceptionType {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  AUTH_FAILURE = 'AUTH_FAILURE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
}

export const Exceptions: Record<ExceptionType, { status: number, message: string }> = {
  [ExceptionType.INTERNAL_SERVER_ERROR]: { status: 500, message: 'An unexpected error occurred' },
  [ExceptionType.BAD_REQUEST]: { status: 400, message: 'Bad request' },
  [ExceptionType.CONFLICT]: { status: 409, message: 'Resource already exists' },
  [ExceptionType.AUTH_FAILURE]: { status: 401, message: 'Auth failure' },
  [ExceptionType.FORBIDDEN]: { status: 403, message: 'Forbidden' },
  [ExceptionType.INVALID_TOKEN]: { status: 401, message: 'Auth failure: token is not provided' },
  [ExceptionType.NOT_FOUND]: { status: 404, message: 'Resource does not exist' },
};