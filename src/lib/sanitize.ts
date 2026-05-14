import DOMPurify from "isomorphic-dompurify";

// Strip all HTML — we don't render user text as HTML, but defence-in-depth.
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
