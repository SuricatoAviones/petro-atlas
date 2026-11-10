import type { ApiError, ApiErrorCode } from '@petroatlas/shared-types';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

import { logError } from './log.ts';

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
  logError(`Unhandled error on ${request.method} ${request.path}`, error);
  if (response.headersSent) {
    next(error);
    return;
  }
  sendError(response, 500, 'INTERNAL', 'Error interno del servidor');
};
