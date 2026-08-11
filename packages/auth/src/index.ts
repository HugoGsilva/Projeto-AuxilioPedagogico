import { createDb } from "@auxilio-pedagogico/db";
import * as schema from "@auxilio-pedagogico/db/schema/auth";
import { env } from "@auxilio-pedagogico/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { recordLoginAudit } from "./login-audit";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
      // ADR-0002 / issue #5: no public self-signup; accounts created by admins.
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "teacher",
          input: false,
        },
        active: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [row] = await db
              .select({ active: schema.user.active })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .limit(1);
            if (row && row.active === false) {
              return false;
            }
          },
          after: async (session, ctx) => {
            // Session already persisted by Better Auth; never block sign-in on audit failure.
            try {
              await recordLoginAudit(db, session, ctx);
            } catch (error) {
              console.error("[auth] falha ao gravar audit_log de login", error);
            }
          },
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
