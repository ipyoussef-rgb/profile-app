import { NextResponse } from "next/server";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function unauthorized() {
  return json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden() {
  return json({ error: "forbidden" }, { status: 403 });
}

export function badRequest(detail?: unknown) {
  return json({ error: "bad_request", detail }, { status: 400 });
}

export function unprocessable(detail: unknown) {
  return json({ error: "unprocessable_entity", detail }, { status: 422 });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return new NextResponse(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSeconds),
    },
  });
}

export function serverError(reason?: string) {
  return json({ error: "internal_error", reason: reason ?? "unexpected" }, { status: 500 });
}
