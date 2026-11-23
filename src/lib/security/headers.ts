/** Build response headers and the policy Next uses to nonce its scripts. */
export function securityHeaders(nonce: string, production: boolean): Headers {
  const scripts = production ? "" : " 'unsafe-eval'";
  const headers = new Headers({
    "Content-Security-Policy": `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "private, no-store",
  });
  if (production) headers.set("Strict-Transport-Security", "max-age=31536000");
  return headers;
}
