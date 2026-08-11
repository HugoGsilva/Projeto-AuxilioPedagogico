import { auth } from "@auxilio-pedagogico/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

function clientIp(context: HonoContext): string | null {
  const forwarded = context.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return context.req.header("x-real-ip") ?? null;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    ip: clientIp(context),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
