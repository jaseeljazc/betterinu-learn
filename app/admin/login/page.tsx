"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { clientAuth } from "@/lib/firebase-client";

export default function AdminLoginPage() {
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

      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Access denied.");
        await clientAuth.signOut();
        return;
      }

      document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Lax`;
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials.";
      setError(msg.includes("invalid-credential") ? "Invalid email or password." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#1a4031] text-white shadow-sm">
            <GraduationCap className="size-7" />
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">BetterInU</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[#7a7a62]">
              <ShieldCheck className="size-3.5" />
              Admin portal
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#e5e2da] bg-white p-6 shadow-sm space-y-4"
        >
          <div>
            <label htmlFor="a-email" className="block text-sm font-semibold mb-1.5">
              Email address
            </label>
            <input
              id="a-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 text-sm outline-none focus:border-[#1a4031] focus:ring-2 focus:ring-[#1a4031]/20"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="a-password" className="block text-sm font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="a-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#1a4031] focus:ring-2 focus:ring-[#1a4031]/20"
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a62] hover:text-[#1a4031] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a4031] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <RoboLoader size="xs" className="text-current" /> : "Sign in to Admin"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#7a7a62]">
          Student?{" "}
          <a href="/login" className="font-semibold text-[#1a4031] hover:underline">
            Student portal →
          </a>
        </p>
      </div>
    </main>
  );
}
