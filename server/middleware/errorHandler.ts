import { Request, Response, NextFunction } from 'express';

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details: any;
  };
  message?: string;
}

export function sendApiError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  details: any = null
): Response {
  const payload: ApiErrorPayload = {
    success: false,
    error: {
      code: errorCode,
      message,
      details: details !== undefined ? details : null,
    },
    message,
  };
  return res.status(statusCode).json(payload);
}

export function sendApiSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    ...data,
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response {
  console.error('[API Error]', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  return sendApiError(res, statusCode, errorCode, message);
}
