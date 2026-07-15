"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldX,
  Terminal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { RequestDetail, FailureAnalysis, ReplayLog } from "@/types";
import { ReplayDialog } from "@/components/replay-dialog";

interface RequestInspectorProps {
  requestId: string;
}

export function RequestInspector({ requestId }: RequestInspectorProps) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [failureAnalysis, setFailureAnalysis] = useState<FailureAnalysis | null>(null);
  const [curl, setCurl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("headers");
  const [prevRequestId, setPrevRequestId] = useState(requestId);
  const [replayLogs, setReplayLogs] = useState<ReplayLog[]>([]);

  if (prevRequestId !== requestId) {
    setPrevRequestId(requestId);
    setLoading(true);
    setRequest(null);
    setFailureAnalysis(null);
    setCurl(null);
    setReplayLogs([]);
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/requests/${requestId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load request");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRequest(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    fetch(`/api/requests/${requestId}/replays`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setReplayLogs(data.data || []);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [requestId]);

  const copyCurl = async () => {
    try {
      if (!curl) {
        const res = await fetch(`/api/requests/${requestId}/curl`);
        if (!res.ok) throw new Error("Failed to generate cURL");
        const data = await res.json();
        setCurl(data.curl);
        navigator.clipboard.writeText(data.curl);
      } else {
        navigator.clipboard.writeText(curl);
      }
      toast.success("cURL command copied");
    } catch {
      toast.error("Failed to copy cURL command");
    }
  };

  const runFailureAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/failure-analysis`);
      if (res.ok) {
        const data = await res.json();
        setFailureAnalysis(data);
        setActiveTab("failure-lens");
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!request) return null;

  const isFailed = request.failureStatus === "failed" || request.failureStatus === "timeout";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-primary/10 text-primary">
          {request.method}
        </span>
        {request.signatureVerified === true && (
          <Badge variant="secondary" className="text-xs">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        )}
        {request.signatureVerified === false && (
          <Badge variant="destructive" className="text-xs">
            <ShieldX className="mr-1 h-3 w-3" />
            Invalid
          </Badge>
        )}
        {request.forwardStatus === "success" && (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            Forwarded {request.forwardResponseCode}
          </Badge>
        )}
        {request.forwardStatus === "failed" && (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="mr-1 h-3 w-3" />
            Forward failed
          </Badge>
        )}
        {request.forwardStatus === "timeout" && (
          <Badge variant="destructive" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Forward timeout
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(request.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={copyCurl}>
          <Terminal className="mr-2 h-3.5 w-3.5" />
          Copy cURL
        </Button>
        <ReplayDialog requestId={requestId} defaultUrl={request.forwardUrl} method={request.method} bodySize={request.bodySize} onReplayed={() => {
          fetch(`/api/requests/${requestId}`)
            .then((res) => res.json())
            .then((data) => setRequest(data));
          fetch(`/api/requests/${requestId}/replays`)
            .then((res) => res.json())
            .then((data) => setReplayLogs(data.data || []))
            .catch(() => {});
        }} />
        {isFailed && (
          <Button variant="outline" size="sm" onClick={runFailureAnalysis} disabled={analysisLoading}>
            <Search className="mr-2 h-3.5 w-3.5" />
            {analysisLoading ? "Analyzing..." : "Failure Lens"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          {replayLogs.length > 0 && <TabsTrigger value="replays">Replays ({replayLogs.length})</TabsTrigger>}
          {failureAnalysis && <TabsTrigger value="failure-lens">Failure Lens</TabsTrigger>}
        </TabsList>

        <TabsContent value="headers" className="flex-1 overflow-auto">
          <div className="rounded-md border border-border">
            {Object.entries(request.headers).map(([key, value]) => (
              <div key={key} className="flex border-b border-border last:border-0 px-3 py-1.5 text-sm">
                <span className="font-mono text-muted-foreground w-40 shrink-0">{key}</span>
                <span className="font-mono break-all">{value}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="body" className="flex-1 overflow-auto">
          {request.body ? (
            <pre className="rounded-md border border-border p-3 text-sm font-mono overflow-auto max-h-[500px]">
              {tryFormatJson(request.body)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No body</p>
          )}
        </TabsContent>

        <TabsContent value="query" className="flex-1 overflow-auto">
          {Object.keys(request.queryParams).length > 0 ? (
            <div className="rounded-md border border-border">
              {Object.entries(request.queryParams).map(([key, value]) => (
                <div key={key} className="flex border-b border-border last:border-0 px-3 py-1.5 text-sm">
                  <span className="font-mono text-muted-foreground w-40 shrink-0">{key}</span>
                  <span className="font-mono break-all">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No query parameters</p>
          )}
        </TabsContent>

        {replayLogs.length > 0 && (
          <TabsContent value="replays" className="flex-1 overflow-auto space-y-3">
            <ReplayHistoryView logs={replayLogs} />
          </TabsContent>
        )}

        {failureAnalysis && (
          <TabsContent value="failure-lens" className="flex-1 overflow-auto space-y-4">
            <FailureLensView analysis={failureAnalysis} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function FailureLensView({ analysis }: { analysis: FailureAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold">Failure Analysis</h3>
      </div>

      {analysis.successRequestId ? (
        <p className="text-sm text-muted-foreground">
          Compared with successful request{" "}
          <span className="font-mono text-xs">{analysis.successRequestId.slice(0, 8)}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No successful request found for comparison. Showing standalone analysis.
        </p>
      )}

      {analysis.heuristics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Heuristic Flags</h4>
          {analysis.heuristics.map((h, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                h.severity === "high"
                  ? "border-red-500/50 bg-red-500/5"
                  : h.severity === "medium"
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-border bg-muted"
              }`}
            >
              <span
                className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                  h.severity === "high" ? "bg-red-500" : h.severity === "medium" ? "bg-yellow-500" : "bg-muted-foreground"
                }`}
              />
              <span>{h.message}</span>
            </div>
          ))}
        </div>
      )}

      {analysis.headerDiffs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Header Differences</h4>
          <div className="rounded-md border border-border">
            {analysis.headerDiffs.map((d, i) => (
              <div key={i} className="border-b border-border last:border-0 px-3 py-2 text-sm">
                <span className="font-mono text-muted-foreground">{d.key}</span>
                <div className="flex gap-4 mt-1 text-xs">
                  <div>
                    <span className="text-red-500">Failed: </span>
                    <span className="font-mono break-all">{d.failedValue}</span>
                  </div>
                  <div>
                    <span className="text-green-500">Success: </span>
                    <span className="font-mono break-all">{d.successValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.bodyDiffs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Body Differences</h4>
          {analysis.bodyDiffs.map((d, i) => (
            <div key={i} className="rounded-md border border-border p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{d.type}</span>
              <p className="mt-1">{d.detail}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.heuristics.length === 0 && analysis.headerDiffs.length === 0 && analysis.bodyDiffs.length === 0 && (
        <p className="text-sm text-muted-foreground">No differences detected.</p>
      )}
    </div>
  );
}

function ReplayHistoryView({ logs }: { logs: ReplayLog[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Replay History</h3>
      </div>
      {logs.map((log) => (
        <div key={log.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {log.status === "success" && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                {log.responseStatus} · {log.responseTime}ms
              </Badge>
            )}
            {log.status === "failed" && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="mr-1 h-3 w-3" />
                Failed{log.responseStatus ? ` · ${log.responseStatus}` : ""}
              </Badge>
            )}
            {log.status === "timeout" && (
              <Badge variant="destructive" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                Timeout · {log.responseTime}ms
              </Badge>
            )}
            {log.isRecovery && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                Recovered
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="text-xs font-mono text-muted-foreground break-all">
            → {log.targetUrl}
          </div>
          {log.errorMessage && (
            <p className="text-xs text-red-500">{log.errorMessage}</p>
          )}
          {log.responseBody && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Response body</summary>
              <pre className="mt-2 rounded-md border border-border p-2 font-mono overflow-auto max-h-48">
                {tryFormatJson(log.responseBody)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
