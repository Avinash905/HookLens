"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

type SignInButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
	provider?: string;
};

export function SignInButton({ provider = "github", children, disabled, ...props }: SignInButtonProps) {
	const [loading, setLoading] = useState(false);

	return (
		<Button onClick={() => { setLoading(true); signIn(provider); }} disabled={disabled || loading} {...props}>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Redirecting...
				</>
			) : (
				children
			)}
		</Button>
	);
}
