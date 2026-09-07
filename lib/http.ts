import { HttpsProxyAgent } from "hpagent";

// Initialize proxy agent if an environment variable is present
const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy;
const agent = proxyUrl ? new HttpsProxyAgent({ proxy: proxyUrl }) : undefined;

export async function fetchWithTimeout(
  input: RequestInfo | URL, 
  init: RequestInit & { timeoutMs?: number } = {}
) {
  // Wrapper around fetch() that aborts the request after timeoutMs.
  // This keeps serverless/Next.js functions from hanging on slow IPTV portals.
  const { timeoutMs = 20000, headers, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders = {
    "User-Agent": "TiviMate/4.7.0 (Linux; Android 11; Shield TV Build/RQ1A.210105.003)",
    "Accept": "*/*",
    "Connection": "keep-alive",
  };

  try {
    // Use no-store so we don't accidentally cache credential-bound responses.
    const res = await fetch(input, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      signal: controller.signal,
      cache: "no-store",
      // @ts-expect-error Node fetch supports custom agent option
      agent,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeJson(res: Response): Promise<unknown> {
  // Some IPTV portals return HTML error pages while still responding with HTTP 200.
  // We surface a short snippet to make debugging easier.
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 250);
    throw new Error(`Server returned non-JSON response. Snippet: ${snippet}`);
  }
}
