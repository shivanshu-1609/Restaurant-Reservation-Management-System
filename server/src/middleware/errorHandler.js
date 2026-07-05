import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let code = error.code || "INTERNAL_ERROR";
  let details;

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = error.errors.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
    code = "INVALID_ID";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with that value already exists";
    code = "DUPLICATE_VALUE";
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
      ...(details ? { details } : {})
    }
  });
}
