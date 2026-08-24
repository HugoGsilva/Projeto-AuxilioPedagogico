import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import * as React from "react";

/**
 * Select nativo estilizado com o preset. Centraliza a aparência do campo de
 * seleção num só lugar — telas usam <Select> em vez de repetir a string de
 * classes do <select>. Reestilizar = editar aqui, nenhuma tela é tocada.
 *
 * Continua sendo um <select> nativo de propósito: no mobile abre o seletor do
 * sistema e o teclado/leitor de tela funcionam sem código extra. O que muda em
 * relação ao padrão do navegador é só a aparência — `appearance-none` remove a
 * seta do SO (que ignora o tema e destoa dos demais campos) e o preset desenha
 * uma seta própria. A seta vive em `globals.css`, na regra de
 * `[data-slot="select"]`: como `background-image: url(<svg…>)` tem aspas e
 * espaços, o valor não sobrevive ao parser de classe arbitrária do Tailwind.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-2 pr-9 pl-3 text-sm transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // <option> herda o fundo do SO no Windows/Linux; força o tema do app.
        "[&>option]:bg-popover [&>option]:text-popover-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
