export interface Endpoint {
  id: string;
  name: string;
  slug: string;
  url: string;
  forwardUrl: string | null;
  autoForward: boolean;
  hasSigningSecret: boolean;
  requestCount: number;
  lastRequestAt: string | null;
  createdAt: string;
}

export interface RequestItem {
  id: string;
  method: string;
  signatureVerified: boolean | null;
  responseStatus: number;
  forwardStatus: string | null;
  forwardResponseCode: number | null;
  failureStatus: "failed" | "timeout" | "recovered" | null;
  bodySize: number;
  createdAt: string;
}

export interface RequestDetail {
  id: string;
  endpointId: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  queryParams: Record<string, string>;
  ipAddress: string | null;
  signatureVerified: boolean | null;
  responseStatus: number;
  responseTime: number;
  forwardStatus: string | null;
  forwardResponseCode: number | null;
  forwardResponseTime: number | null;
  failureStatus: "failed" | "timeout" | "recovered" | null;
  bodySize: number;
  createdAt: string;
  forwardUrl: string | null;
}

export interface ReplayLog {
  id: string;
  requestId: string;
  targetUrl: string;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  responseTime: number | null;
  status: "success" | "failed" | "timeout";
  isRecovery: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface FailureHeuristic {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface HeaderDiff {
  key: string;
  failedValue: string;
  successValue: string;
}

export interface BodyDiff {
  type: string;
  detail: string;
}

export interface FailureAnalysis {
  requestId: string;
  successRequestId: string | null;
  heuristics: FailureHeuristic[];
  headerDiffs: HeaderDiff[];
  bodyDiffs: BodyDiff[];
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
