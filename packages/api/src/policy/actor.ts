import { TRPCError } from "@trpc/server";

import type { Actor } from "./access";
import { ROLES, type Role } from "./permissions";

/** Extrai o Actor da sessão, rejeitando papéis fora da matriz (ADR-0002). */
export function actorFromSession(sessionUser: {
  id: string;
  role?: string | null;
}): Actor {
  const role = sessionUser.role;
  if (!role || !ROLES.includes(role as Role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Perfil de usuário inválido",
    });
  }
  return { id: sessionUser.id, role: role as Role };
}
