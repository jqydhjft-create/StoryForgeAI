/** Redacts credential-shaped values before arbitrary diagnostic text reaches the UI. */
export function redactDiagnosticText(value: string): string {
  return value
    .replace(/\b(Authorization\s*:\s*(?:Bearer|Basic|Token))\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/(["'](?:api(?:[_-]?key)?|key|token|password)["']\s*:\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, '$1"[redacted]"')
    .replace(/\b(api(?:[_ -]?key)?|key|token|password)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1: [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]');
}
