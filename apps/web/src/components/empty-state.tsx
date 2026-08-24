import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@auxilio-pedagogico/ui/components/empty";
import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Estado vazio padrão das listas.
 *
 * Antes cada tela resolvia do seu jeito: Alunos e estudo de caso usavam
 * <Empty> em card, enquanto Atribuições, Perguntas e Usuários mostravam só um
 * <p> cinza solto sobre o canvas — e nenhuma oferecia o próximo passo. Aqui a
 * lista vazia vira um bloco com ícone, o que falta e, quando o papel permite,
 * o botão que resolve.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** Ação que resolve o vazio. Omitir quando o papel não pode criar. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("border border-border bg-card", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export { EmptyState };
