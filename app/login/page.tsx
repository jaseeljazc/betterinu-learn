"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { clientAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await credential.user.getIdToken();

      // Verify token against students table
      const res = await fetch("/api/student/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Access denied. Please contact your admin.");
        await clientAuth.signOut();
        return;
      }

      // Store token in cookie for middleware
      document.cookie = `__session=${idToken}; path=/; max-age=604800; SameSite=Lax`;
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid email or password.";
      setError(msg.includes("invalid-credential") ? "Invalid email or password." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-light text-primary shadow-sm">
            <GraduationCap className="size-7" />
          </span>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">BetterInU</h1>
            <p className="mt-1 text-sm text-secondary">Sign in to your student account</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-default bg-surface p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 pr-10 text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <RoboLoader size="xs" className="text-current" /> : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Admin?{" "}
          <a href="/admin/login" className="font-semibold text-primary hover:underline">
            Admin portal →
          </a>
        </p>
      </div>
    </main>
  );
}
