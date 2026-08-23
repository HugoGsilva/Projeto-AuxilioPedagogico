import { getServerUrl } from "@/lib/server-url";
import { env } from "@auxilio-pedagogico/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // better-auth derives its route-matching base from this URL's path, so the
  // public auth path must equal the server-side mount (/api/auth everywhere)
  baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString(),
});
