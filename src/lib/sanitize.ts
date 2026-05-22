// Plain-text sanitizer. We never render user-supplied strings as HTML —
// this is defence-in-depth: strip anything that looks like a tag and drop
// control characters, then trim. Kept dependency-free because the previous
// isomorphic-dompurify dep pulled in jsdom + html-encoding-sniffer +
// @exodus/bytes (ESM-only), which crashed the Vercel serverless runtime
// with ERR_REQUIRE_ESM.

export function sanitizeText(input: string): string {
  return input
    // Drop HTML/XML tags entirely (greedy minimal-match).
    .replace(/<[^>]*>/g, "")
    // Drop control chars except common whitespace (\t \n \r).
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}
