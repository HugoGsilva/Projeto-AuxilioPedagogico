import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Casca de página: container, cabeçalho e seção em card.
 *
 * O cabeçalho estava duplicado em todas as telas com variações de espaçamento
 * (`space-y-6` vs `space-y-8`, `px-4` vs `px-4 sm:px-6`). Centralizar aqui
 * mantém a escala consistente — mudar o ritmo da página = editar este arquivo.
 */

function Page({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="page"
      className={cn(
        "mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Estilo do link "voltar" acima do título.
 *
 * É uma classe, e não um componente que embrulha <Link>: o Link do TanStack é
 * genérico sobre a rota, e envolvê-lo apagaria a inferência de `to`/`params`
 * (um `params` errado deixaria de ser erro de compilação). A tela passa o
 * próprio <Link> e só empresta a aparência daqui.
 */
const pageBackClass =
  "-ml-1 inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Seta do link "voltar", para acompanhar `pageBackClass`. */
function PageBackIcon() {
  return <ChevronLeft aria-hidden className="size-4" />;
}

function PageHeader({
  title,
  description,
  actions,
  back,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Ações principais da tela, alinhadas à direita no desktop. */
  actions?: ReactNode;
  /** Slot para <PageBack>, renderizado acima do título. */
  back?: ReactNode;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("space-y-3", className)}
      {...props}
    >
      {back}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Bloco de conteúdo em card claro sobre o canvas. */
function Section({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      data-slot="section"
      className={cn(
        "space-y-5 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6",
        className,
      )}
      {...props}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="font-semibold tracking-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Título de agrupamento fora de card (ex.: "Lista por seção" nas Perguntas).
 * Menor que o <h1> da página e maior que o corpo — degrau intermediário.
 */
function SectionLabel({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="section-label"
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Page, PageBackIcon, pageBackClass, PageHeader, Section, SectionLabel };
