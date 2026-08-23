import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Auxílio Pedagógico
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento de alunos com necessidades especiais.
        </p>
      </div>

      <section className="space-y-2 rounded-lg border border-border p-5">
        <h2 className="font-medium">Status do sistema</h2>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-2 rounded-full ${
              healthCheck.data ? "bg-success" : "bg-destructive"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {healthCheck.isLoading
              ? "Verificando…"
              : healthCheck.data
                ? "Conectado à API"
                : "API indisponível"}
          </span>
        </div>
      </section>
    </div>
  );
}
