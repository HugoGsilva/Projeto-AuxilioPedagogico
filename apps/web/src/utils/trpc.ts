import type { AppRouter } from "@auxilio-pedagogico/api/routers/index";
import { env } from "@auxilio-pedagogico/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* Erros de permissão/sessão são determinísticos — re-tentar só atrasa
       * o feedback de "Permissão negada" na tela. */
      retry: (failureCount, error) => {
        const code = (error as { data?: { code?: string } | null }).data?.code;
        if (code === "FORBIDDEN" || code === "UNAUTHORIZED") return false;
        return failureCount < 3;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            query.invalidate();
          },
        },
      });
    },
  }),
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getServerUrl(env.VITE_SERVER_URL)}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
