"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type SignInButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  provider?: string;
};

export function SignInButton({ provider = "github", children, ...props }: SignInButtonProps) {
  return (
    <Button onClick={() => signIn(provider)} {...props}>
      {children}
    </Button>
  );
}
