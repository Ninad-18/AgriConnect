import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : err instanceof Error
      ? err.message
      : "Internal server error";

  if (statusCode === 500) {
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
}

// wrap async controllers to forward errors to express
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
