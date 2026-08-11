import { Button } from "@auxilio-pedagogico/ui/components/button";
import { Input } from "@auxilio-pedagogico/ui/components/input";
import { Label } from "@auxilio-pedagogico/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/users")({
  component: UsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  director: "Diretora",
  it_admin: "TI",
  pedagogue: "Pedagoga",
  teacher: "Professora",
};

const ROLE_OPTIONS = [
  "director",
  "it_admin",
  "pedagogue",
  "teacher",
] as const;

function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery(trpc.user.list.queryOptions());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<(typeof ROLE_OPTIONS)[number]>("teacher");

  const createMutation = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Usuário criado");
        setName("");
        setEmail("");
        setPassword("");
        setRole("teacher");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setActiveMutation = useMutation(
    trpc.user.setActive.mutationOptions({
      onSuccess: async () => {
        toast.success("Situação atualizada");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Usuário atualizado");
        await queryClient.invalidateQueries(trpc.user.list.queryFilter());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Crie, edite o perfil e desative contas. Não há exclusão física.
        </p>
      </div>

      <section className="space-y-4 border border-border p-4">
        <h2 className="font-medium">Novo usuário</h2>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ name, email, password, role });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Perfil</Label>
            <select
              id="role"
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof ROLE_OPTIONS)[number])
              }
            >
              {ROLE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        {usersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : usersQuery.isError ? (
          <p className="text-sm text-destructive">{usersQuery.error.message}</p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Perfil</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data?.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <select
                        className="h-8 rounded-none border border-input bg-transparent px-2 text-xs"
                        value={u.role}
                        disabled={updateMutation.isPending}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: u.id,
                            role: e.target.value as (typeof ROLE_OPTIONS)[number],
                          })
                        }
                      >
                        {ROLE_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {u.active ? "Ativo" : "Desativado"}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setActiveMutation.isPending}
                        onClick={() =>
                          setActiveMutation.mutate({
                            id: u.id,
                            active: !u.active,
                          })
                        }
                      >
                        {u.active ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
