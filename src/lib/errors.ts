export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
