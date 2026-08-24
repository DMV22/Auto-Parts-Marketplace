export type AppErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unavailable"
  | "http"
  | "network"
  | "aborted"
  | "invalid_response";

type AppErrorOptions = {
  kind: AppErrorKind;
  status?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
};

type ErrorPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
};

const statusKinds: Partial<Record<number, AppErrorKind>> = {
  400: "validation",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  503: "unavailable",
};

function readMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const { message, error } = payload as ErrorPayload;

  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    const messages = message.filter(
      (value): value is string => typeof value === "string",
    );

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return fallback;
}

function readCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const { code } = payload as ErrorPayload;
  return typeof code === "string" ? code : undefined;
}

export class AppError extends Error {
  override readonly name = "AppError";
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }

  static fromResponse(status: number, payload: unknown): AppError {
    return new AppError(
      readMessage(payload, `Request failed with status ${status}`),
      {
        kind: statusKinds[status] ?? "http",
        status,
        code: readCode(payload),
        details: payload,
      },
    );
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
