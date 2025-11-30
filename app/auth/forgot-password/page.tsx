"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Mail, Loader2, ArrowLeft, CheckCircle2, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset email");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Link href="/auth/signin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Sign In
        </Link>

        <div className="bg-card rounded-xl p-6 border shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-lg font-semibold mb-2">Check your email</h1>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a password reset link to <span className="text-foreground font-medium">{email}</span>
              </p>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p>Didn't receive it? Check your spam folder or try again.</p>
              </div>
              <button
                onClick={() => { setSuccess(false); setEmail(""); }}
                className="mt-4 text-xs text-primary hover:underline"
              >
                Try different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-1">Forgot password?</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <Send className="w-4 h-4" /> Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground mt-5">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Built by <span className="font-medium text-foreground">Karthikeyan G</span>
        </p>
      </div>
    </main>
  );
}
