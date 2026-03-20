import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

const noAuthResponse = (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/get-session")) {
    return NextResponse.json({ session: null, user: null });
  }
  return NextResponse.json(
    { error: "Auth not configured. Add DATABASE_URL to .env.local (see .env.example)." },
    { status: 503 }
  );
};

async function getAuthHandler() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  const { auth } = await import("@/lib/auth");
  if (!auth) return null;
  return toNextJsHandler(auth);
}

let handlerPromise: ReturnType<typeof getAuthHandler> | null = null;

export async function POST(req: Request) {
  const h = handlerPromise ?? (handlerPromise = getAuthHandler());
  const handler = await h;
  if (!handler) return noAuthResponse(req);
  return handler.POST(req);
}

export async function GET(req: Request) {
  const h = handlerPromise ?? (handlerPromise = getAuthHandler());
  const handler = await h;
  if (!handler) return noAuthResponse(req);
  return handler.GET(req);
}
