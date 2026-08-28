import { AppError } from "@/lib/api/app-error";

type AttemptKeyFactory = () => string;

export function getOrCreateCheckoutAttemptKey(
  currentKey: string | null,
  generate: AttemptKeyFactory = () => crypto.randomUUID(),
): string {
  return currentKey ?? generate();
}

export function shouldReuseCheckoutAttempt(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.kind === "network" || error.kind === "aborted")
  );
}
