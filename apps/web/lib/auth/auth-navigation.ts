const FALLBACK_DESTINATION = "/";
const AUTH_ROUTES = new Set(["/sign-in", "/sign-up"]);
const LOCAL_ORIGIN = "http://frontend.local";

export function safeReturnTo(value: string | null | undefined): string {
  if (!value) {
    return FALLBACK_DESTINATION;
  }

  try {
    const destination = new URL(value, LOCAL_ORIGIN);

    if (
      destination.origin !== LOCAL_ORIGIN ||
      AUTH_ROUTES.has(destination.pathname)
    ) {
      return FALLBACK_DESTINATION;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return FALLBACK_DESTINATION;
  }
}
