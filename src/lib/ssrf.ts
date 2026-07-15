import dns from "dns";
import ipaddr from "ipaddr.js";

const BLOCKED_IPV4_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "100.64.0.0/10",
  "192.0.2.0/24",
  "198.51.100.0/24",
  "203.0.113.0/24",
];

const BLOCKED_IPV6_RANGES = ["::1/128", "fc00::/7", "fe80::/10", "::/128"];

export interface SsrfResult {
  allowed: boolean;
  ip?: string;
  reason?: string;
}

export function isBlockedIP(ipStr: string): boolean {
  try {
    const addr = ipaddr.parse(ipStr);

    if (addr.kind() === "ipv4") {
      const ip = (addr as ipaddr.IPv4).toString();
      for (const range of BLOCKED_IPV4_RANGES) {
        if (ipaddr.IPv4.isValid(ip) && (ipaddr.IPv4.parse(ip) as ipaddr.IPv4).match(ipaddr.IPv4.parseCIDR(range))) {
          return true;
        }
      }
    } else if (addr.kind() === "ipv6") {
      const ip = (addr as ipaddr.IPv6).toString();
      for (const range of BLOCKED_IPV6_RANGES) {
        if (ipaddr.IPv6.isValid(ip) && (ipaddr.IPv6.parse(ip) as ipaddr.IPv6).match(ipaddr.IPv6.parseCIDR(range))) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return true;
  }
}

export function pinIpInUrl(url: string, ip: string): { url: string; host: string } {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = parsed.port;
  parsed.hostname = ip.includes(":") ? `[${ip}]` : ip;
  if (port) parsed.port = port;
  return { url: parsed.toString(), host };
}

export async function validateUrl(url: string): Promise<SsrfResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { allowed: false, reason: `Protocol ${parsed.protocol} not allowed` };
  }

  const hostname = parsed.hostname;

  let ips: string[];
  try {
    ips = await dns.promises.resolve4(hostname);
  } catch {
    try {
      ips = await dns.promises.resolve6(hostname);
    } catch {
      return { allowed: false, reason: "DNS resolution failed" };
    }
  }

  for (const ip of ips) {
    if (isBlockedIP(ip)) {
      return { allowed: false, ip, reason: "Resolves to private/blocked IP range" };
    }
  }

  return { allowed: true, ip: ips[0] };
}
