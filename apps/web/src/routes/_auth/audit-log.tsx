import { Badge } from "@auxilio-pedagogico/ui/components/badge";
import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Callout } from "@auxilio-pedagogico/ui/components/callout";
import { Field, FieldLabel } from "@auxilio-pedagogico/ui/components/field";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Select } from "@auxilio-pedagogico/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@auxilio-pedagogico/ui/components/table";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { History, Info } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";

import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader } from "@/components/page";
import { useRole } from "@/lib/access";
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  actionLabel,
  entityLabel,
} from "@/lib/audit-labels";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/audit-log")({
  component: AuditLogPage,
});

function PayloadDetails({
  redacted,
  before,
  after,
}: {
  redacted: boolean;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (redacted) {
    return (
      <Badge variant="muted" title="O perfil de TI não visualiza dados de alunos">
        Dados protegidos
      </Badge>
    );
  }
  if (before == null && after == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
        Ver alteração
      </summary>
      <div className="mt-2 max-w-md space-y-2 text-xs">
        {before != null ? (
          <div>
            <p className="font-medium">Antes</p>
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        ) : null}
        {after != null ? (
          <div>
            <p className="font-medium">Depois</p>
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function AuditLogPage() {
  const { data: session } = authClient.useSession();
  const { role } = useRole();
  const isTeacher = role === "teacher";
  const isItAdmin = role === "it_admin";

  const [userId, setUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const userOptionsQuery = useQuery({
    ...trpc.auditLog.userOptions.queryOptions(),
    enabled: Boolean(session?.user?.id) && !isTeacher,
  });

  const listQuery = useInfiniteQuery(
    trpc.auditLog.list.infiniteQueryOptions(
      {
        userId: userId || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 50,
      },
      {
        enabled: Boolean(session?.user?.id),
        getNextPageParam: (last) => last.nextCursor ?? undefined,
      },
    ),
  );

  const rows = listQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isEmpty = !listQuery.isPending && !listQuery.isError && rows.length === 0;

  function clearFilters() {
    setUserId("");
    setEntityType("");
    setAction("");
    setFrom("");
    setTo("");
  }

  return (
    <Page>
      <PageHeader
        title="Auditoria"
        description="Histórico das ações registradas no sistema: quem fez, o quê e quando."
      />

      {isTeacher ? (
        <Callout>
          <Info />
          <span>Mostrando apenas as suas ações.</span>
        </Callout>
      ) : null}
      {isItAdmin ? (
        <Callout>
          <Info />
          <span>
            Registros que envolvem alunos aparecem sem os valores alterados.
          </span>
        </Callout>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {!isTeacher ? (
          <Field>
            <FieldLabel htmlFor="audit-user">Usuário</FieldLabel>
            <Select
              id="audit-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Todos</option>
              {(userOptionsQuery.data ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="audit-entity">Entidade</FieldLabel>
          <Select
            id="audit-entity"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-action">Tipo de ação</FieldLabel>
          <Select
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-from">De</FieldLabel>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-to">Até</FieldLabel>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </section>
      <div>
        <Button type="button" variant="outline" onClick={clearFilters}>
          Limpar filtros
        </Button>
      </div>

      {listQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive">{listQuery.error.message}</p>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={History}
          title="Nenhum registro encontrado"
          description="Ajuste os filtros ou aguarde novas ações no sistema."
        />
      ) : null}

      {rows.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <Table bare>
              <TableHeader>
                <TableRow>
                  <TableHead>Data e hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      {row.actorName ?? (
                        <span className="text-muted-foreground">
                          (conta removida)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{actionLabel(row.action)}</TableCell>
                    <TableCell>
                      <span className="block">{entityLabel(row.entityType)}</span>
                      {row.entityId ? (
                        <span className="block max-w-40 truncate text-xs text-muted-foreground">
                          {row.entityId}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PayloadDetails
                        redacted={row.redacted}
                        before={row.before}
                        after={row.after}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {listQuery.hasNextPage ? (
            <div className="border-t border-border p-3 text-center">
              <Button
                type="button"
                variant="outline"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage
                  ? "Carregando…"
                  : "Carregar mais"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </Page>
  );
}
