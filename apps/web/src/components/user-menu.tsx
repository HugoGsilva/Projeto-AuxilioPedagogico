import { Button } from "@auxilio-pedagogico/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@auxilio-pedagogico/ui/components/dropdown-menu";
import { Skeleton } from "@auxilio-pedagogico/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <Button variant="outline">Entrar</Button>
      </Link>
    );
  }

  // `session.user` pode não estar populado num render transitório do useSession;
  // ler `.name` direto quebrava a tela inteira (tela branca em produção).
  const displayName = session.user?.name ?? session.user?.email ?? "Minha conta";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {displayName}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {session.user?.email ? (
            <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: async () => {
                    queryClient.clear();
                    navigate({
                      to: "/login",
                    });
                  },
                },
              });
            }}
          >
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
