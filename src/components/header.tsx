"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Webhook, LogOut, LayoutDashboard } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Webhook className="h-5 w-5 text-primary" />
          HookLens
        </Link>

        {status === "authenticated" && session ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="flex items-center gap-2">
                  {session.user?.image && (
                    <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
                  )}
                  <span className="hidden sm:inline">{session.user?.name}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => signIn("github")}>Get Started</Button>
        )}
      </div>
    </header>
  );
}
