"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      const credential = await signInWithEmailAndPassword(
        clientAuth,
        email,
        password,
      );
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

      // Session cookie set by /api/student/auth/verify (httpOnly, 7 days)
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password.";
      if (msg.includes("invalid-credential")) {
        setError("Invalid email or password.");
      } else if (msg.includes("user-disabled")) {
        setError("Access denied. Please contact your admin.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-subtle p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-default bg-white shadow-xl grid md:grid-cols-2">
          {/* Left: Form */}
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <div className="mb-8 text-left">
              {/* <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary-light text-primary mb-4 shadow-sm border border-primary/10">
                <GraduationCap className="size-6" />
              </span> */}
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-secondary">
                Sign in to your Betterinu student account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-foreground"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-default bg-surface px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-bold text-base text-white"
                disabled={loading}
              >
                {loading ? (
                  <RoboLoader size="xs" className="text-white" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* <div className="mt-8 text-center text-sm text-muted">
              Are you an admin?{" "}
              <Link
                href="/admin/login"
                className="font-semibold text-primary hover:underline underline-offset-4"
              >
                Admin portal →
              </Link>
            </div> */}
          </div>

          {/* Right: Branding Image */}
          <div className="relative hidden md:block overflow-hidden border-l border-default">
            <Image
              src="/betty-img.png"
              alt="Betterinu Login Branding"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  );
}
