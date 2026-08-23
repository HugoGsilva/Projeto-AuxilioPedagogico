import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import * as React from "react";

/**
 * Select nativo estilizado com o preset. Centraliza a aparência do campo de
 * seleção num só lugar — telas usam <Select> em vez de repetir a string de
 * classes do <select>. Reestilizar = editar aqui, nenhuma tela é tocada.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
