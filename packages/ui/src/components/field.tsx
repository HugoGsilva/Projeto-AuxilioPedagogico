import { cn } from "@auxilio-pedagogico/ui/lib/utils";
import * as React from "react";

import { Label } from "@auxilio-pedagogico/ui/components/label";

/**
 * Agrupa rótulo + controle + erro num só componente, eliminando a repetição de
 * <div className="space-y-2"><Label/>…</div> espalhada pelas telas.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("group/field space-y-2", className)}
      {...props}
    />
  );
}

function FieldLabel({
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  return (
    <Label {...props}>
      {children}
      {required ? <span aria-hidden className="text-destructive"> *</span> : null}
    </Label>
  );
}

function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldError };
