export const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
	"host",
]);

export const FORWARD_TIMEOUT = 15000;
export const MAX_BODY_SIZE = 1024 * 1024;
