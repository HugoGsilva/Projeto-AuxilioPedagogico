import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import type { ReactNode } from "react";

/**
 * Forma estrutural mínima de um resultado do react-query. Evita depender do
 * tipo nominal UseQueryResult (que duplica no monorepo por hoisting e carrega o
 * genérico de erro do tRPC) — qualquer query compatível encaixa.
 */
type QueryLike<T> = {
  isError: boolean;
  isPending: boolean;
  data: T | undefined;
  error: { message: string } | null;
};

/**
 * Estado único de tela orientado a dados: resolve carregando (Skeleton), erro e
 * vazio de forma consistente, e só então renderiza os dados. Substitui os
 * blocos ad-hoc de <p>Carregando…</p> / erro espalhados pelas telas
 * (frontend-conventions: loading/vazio/erro como componentes reais).
 */
export function QueryState<T>({
  query,
  children,
  loading,
  empty,
  isEmpty,
}: {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        {query.error?.message ?? "Erro ao carregar."}
      </p>
    );
  }

  if (query.isPending || query.data === undefined) {
    return (
      loading ?? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      )
    );
  }

  if (isEmpty?.(query.data)) {
    return <>{empty}</>;
  }

  return <>{children(query.data)}</>;
}
