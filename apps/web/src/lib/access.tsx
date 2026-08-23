import {
  can as canServer,
  ROLES,
  type Permission,
  type Role,
} from "@auxilio-pedagogico/api/policy/permissions";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Espelho no cliente do policy do servidor (ADR-0002). Reusa exatamente o
 * mesmo `can`/matriz de `permissions.ts` — a UI nunca redefine regra de papel,
 * então não há como divergir do servidor. Verificação de verdade continua no
 * servidor; aqui é só para esconder/mostrar controles.
 */

export type { Permission, Role };

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function useRole(): {
  role: Role | null;
  can: (permission: Permission) => boolean;
  isLoading: boolean;
} {
  const { data: session, isPending } = authClient.useSession();
  const raw = (session?.user as { role?: string } | undefined)?.role;
  const role = isRole(raw) ? raw : null;

  return {
    role,
    can: (permission: Permission) => (role ? canServer(role, permission) : false),
    isLoading: isPending,
  };
}

/**
 * Renderiza `children` só quando o papel atual tem a permissão. Use para
 * esconder ações/telas — não como controle de segurança (isso é no servidor).
 */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can } = useRole();
  return <>{can(permission) ? children : fallback}</>;
}
