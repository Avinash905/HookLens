"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RequestItem } from "@/types";

interface LiveFeedProps {
  endpointId: string;
  onRequests: (requests: RequestItem[]) => void;
}

export function LiveFeed({ endpointId, onRequests }: LiveFeedProps) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/stream/${endpointId}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      lastSeenIdRef.current = data.lastRequestId;
      setConnected(true);
      setReconnecting(false);
    });

    es.addEventListener("request", (e) => {
      const data: RequestItem = JSON.parse((e as MessageEvent).data);
      lastSeenIdRef.current = data.id;
      onRequests([data]);
    });

    es.addEventListener("heartbeat", () => {
      setConnected(true);
      setReconnecting(false);
    });

    es.addEventListener("close", () => {
      es.close();
      setConnected(false);
      setReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), 1000);
    });

    es.onerror = () => {
      setConnected(false);
      setReconnecting(true);
      es.close();
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), 1000);
      }
    };
  }, [endpointId, onRequests]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return (
    <div className="flex items-center gap-2 text-sm">
      {connected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-green-500">Live</span>
        </>
      ) : reconnecting ? (
        <>
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="text-yellow-500">Reconnecting...</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Connecting...</span>
        </>
      )}
    </div>
  );
}
