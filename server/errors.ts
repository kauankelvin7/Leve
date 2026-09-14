export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown, cause?: unknown) {
    super(message, { cause });
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
