import type { Endpoint } from "@/types";

export function formatEndpoint(e: {
	id: string;
	name: string;
	slug: string;
	forwardUrl: string | null;
	autoForward: boolean;
	signingSecret: string | null;
	requestCount: number;
	lastRequestAt: Date | null;
	createdAt: Date;
}): Endpoint {
	const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
	return {
		id: e.id,
		name: e.name,
		slug: e.slug,
		url: `${baseUrl}/u/${e.slug}`,
		forwardUrl: e.forwardUrl,
		autoForward: e.autoForward,
		hasSigningSecret: !!e.signingSecret,
		requestCount: e.requestCount,
		lastRequestAt: e.lastRequestAt?.toISOString() ?? null,
		createdAt: e.createdAt.toISOString(),
	};
}
