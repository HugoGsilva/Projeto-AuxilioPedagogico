import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const calloutVariants = cva(
  "flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-primary/25 bg-primary/5 text-foreground [&>svg]:text-primary",
        muted: "border-border bg-muted/50 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

/**
 * Aviso inline discreto (não é toast nem alerta bloqueante). Ex.: informar à
 * professora que a lista está filtrada pelos alunos atribuídos a ela.
 */
function Callout({
  className,
  variant = "info",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  return (
    <div
      data-slot="callout"
      className={cn(calloutVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Callout, calloutVariants };
