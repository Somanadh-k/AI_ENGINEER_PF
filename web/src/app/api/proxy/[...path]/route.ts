import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const API_BASE = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "authorization",
  "cookie",
  "user-agent",
  "referer",
  "x-forwarded-for",
  "x-vercel-ip-country",
  "cf-ipcountry",
];
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "retry-after",
  "x-accel-buffering",
  "content-disposition",
];

async function proxy(request: NextRequest, segments: string[]): Promise<Response> {
  if (!ALLOWED_METHODS.has(request.method)) {
    return Response.json({ detail: "Method not allowed" }, { status: 405 });
  }
  if (segments.some((segment) => !segment || segment === ".." || segment.includes("/"))) {
    return Response.json({ detail: "Invalid path" }, { status: 400 });
  }

  const target = new URL(`/api/${segments.join("/")}`, API_BASE);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("x-forwarded-for")) {
    const forwarded = request.headers.get("x-real-ip");
    if (forwarded) headers.set("x-forwarded-for", forwarded);
  }

  if (process.env.API_PROXY_TOKEN) headers.set("x-proxy-token", process.env.API_PROXY_TOKEN);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { detail: "The intelligence service is temporarily unreachable.", offline: true },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("X-Proxy", "somanadh-os");
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
