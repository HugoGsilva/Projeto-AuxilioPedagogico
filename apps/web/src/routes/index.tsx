import { createFileRoute, redirect } from "@tanstack/react-router";

// A home logada é o Painel. "/" apenas redireciona; se não houver sessão, o
// layout _auth em /dashboard encaminha para /login.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
