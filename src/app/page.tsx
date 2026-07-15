import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@/components/sign-in-button";
import { GitBranch, Eye, RefreshCw, Shield, Search, Terminal, KeyRound } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              SSRF-protected &middot; Signature-verified &middot; Failure-diagnosed
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Debug webhooks with <span className="text-primary">Failure Lens</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Capture, inspect, replay, and automatically diagnose webhook failures.
              Compare failed vs successful deliveries with heuristic analysis, no more guessing.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <SignInButton size="lg">
                <GitBranch className="mr-2 h-4 w-4" />
                Get Started
              </SignInButton>
              <Button render={<Link href="#features" />} nativeButton={false} variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Capture & Inspect"
              description="See every webhook request — headers, body, query params, and response. Real-time SSE feed with no page refresh."
            />
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Failure Lens"
              description="Automatically compares failed deliveries with successful ones. Header diffs, body diffs, and heuristic flags pinpoint the cause."
            />
            <FeatureCard
              icon={<RefreshCw className="h-6 w-6" />}
              title="Replay & Recover"
              description="Re-send any captured webhook to any URL. Successful replays mark failed requests as recovered."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="SSRF Protection"
              description="Replay and forwarding targets are validated against private IP ranges and cloud metadata endpoints. DNS rebinding defense included."
            />
            <FeatureCard
              icon={<KeyRound className="h-6 w-6" />}
              title="Webhook Signature Validation"
              description="Verify webhook authenticity with HMAC-SHA256 constant-time comparison. Know which requests are legit."
            />
            <FeatureCard
              icon={<Terminal className="h-6 w-6" />}
              title="cURL Export"
              description="Copy any captured request as a cURL command. Debug locally in seconds."
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20">
          <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
            <h2 className="text-2xl font-bold">Ready to debug your webhooks?</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in with GitHub and create your first endpoint in under 30 seconds.
            </p>
            <SignInButton size="lg" className="mt-6">
              Start Debugging
            </SignInButton>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          HookLens &mdash; Webhook Inspector &amp; Debugger
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
