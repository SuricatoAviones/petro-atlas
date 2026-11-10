import type { ApiError, ApiErrorCode } from '@petroatlas/shared-types';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

import { logError } from './log.ts';

/** An expected failure with its HTTP status and public code: bad parameters, missing resource. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/** Sends the common error body of docs/06: `{ error: { code, message } }`. */
export function sendError(
  response: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
): void {
  const body: ApiError = { error: { code, message } };
  response.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (request, response) => {
  sendError(
    response,
    404,
    'ROUTE_NOT_FOUND',
    `No existe la ruta ${request.method} ${request.path}`,
  );
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }
  logError(`Unhandled error on ${request.method} ${request.path}`, error);
  sendError(response, 500, 'INTERNAL', 'Error interno del servidor');
};
