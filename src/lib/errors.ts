/**
 * Application error hierarchy.
 * Route handlers and server actions translate these into safe HTTP responses.
 * Never leak stack traces or database details to the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly issues?: unknown;

  constructor(statusCode: number, message: string, code = "APP_ERROR", issues?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.issues = issues;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to access this resource.") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state of the resource.") {
    super(409, message, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request could not be validated.", issues?: unknown) {
    super(400, message, "VALIDATION_ERROR", issues);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(429, message, "RATE_LIMIT");
  }
}
