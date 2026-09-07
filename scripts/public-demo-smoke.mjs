const DEFAULT_WEB_URL = "https://auto-parts-marketplace-web-bqbz.vercel.app";
const DEFAULT_API_URL = "https://auto-parts-marketplace-api.onrender.com";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

const webUrl = validatedBaseUrl(
  process.env.PUBLIC_DEMO_WEB_URL ?? DEFAULT_WEB_URL,
  "PUBLIC_DEMO_WEB_URL",
);
const apiUrl = validatedBaseUrl(
  process.env.PUBLIC_DEMO_API_URL ?? DEFAULT_API_URL,
  "PUBLIC_DEMO_API_URL",
);

const checks = [
  { name: "API liveness", url: new URL("/api/v1/health/live", apiUrl) },
  { name: "API readiness", url: new URL("/api/v1/health/ready", apiUrl) },
  { name: "Web home", url: new URL("/", webUrl) },
  { name: "Web catalog", url: new URL("/catalog", webUrl) },
];

let failed = false;

for (const check of checks) {
  try {
    const result = await requestWithRetry(check.url);
    process.stdout.write(
      `PASS ${check.name} status=${result.status} durationMs=${result.durationMs} url=${check.url.origin}${check.url.pathname}\n`,
    );
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(
      `FAIL ${check.name} reason=${message} url=${check.url.origin}${check.url.pathname}\n`,
    );
  }
}

if (failed) process.exitCode = 1;

async function requestWithRetry(url) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: { accept: "text/html, application/json;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      await response.body?.cancel();
      return { status: response.status, durationMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await delay((attempt + 1) * 2_000);
      }
    }
  }

  if (lastError instanceof Error && lastError.name === "TimeoutError") {
    throw new Error("REQUEST_TIMEOUT");
  }
  if (lastError instanceof Error && /^HTTP_\d{3}$/.test(lastError.message)) {
    throw lastError;
  }
  throw new Error("REQUEST_FAILED");
}

function validatedBaseUrl(value, name) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS`);
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
