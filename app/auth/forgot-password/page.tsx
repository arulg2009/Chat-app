"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Mail, Loader2, ArrowLeft, CheckCircle2, User, Lock, Eye, EyeOff, KeyRound } from "lucide-react";

type Step = "email" | "verify" | "reset" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [realName, setRealName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, step: "check-email" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email not found");
      setStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, realName, step: "verify-name" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setStep("reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, realName, newPassword, step: "reset-password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");
      setStep("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {["email", "verify", "reset"].map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
            step === s ? "gradient-primary text-white" : 
            (step === "verify" && s === "email") || (step === "reset" && (s === "email" || s === "verify")) || step === "success"
              ? "bg-green-500 text-white" 
              : "bg-muted text-muted-foreground"
          }`}>
            {(step === "verify" && s === "email") || (step === "reset" && (s === "email" || s === "verify")) || step === "success"
              ? <CheckCircle2 className="w-3 h-3" />
              : i + 1}
          </div>
          {i < 2 && <div className={`w-8 h-0.5 mx-1 ${
            (step === "verify" && s === "email") || (step === "reset") || step === "success" ? "bg-green-500" : "bg-muted"
          }`} />}
        </div>
      ))}
    </div>
  );

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

          {step !== "success" && renderStepIndicator()}

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          {step === "success" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-lg font-semibold mb-2">Password Reset!</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push("/auth/signin")}
                className="w-full py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Sign In
              </button>
            </div>
          ) : step === "email" ? (
            <>
              <h1 className="text-lg font-semibold mb-1">Forgot password?</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your email to start the recovery process.
              </p>

              <form onSubmit={handleCheckEmail} className="space-y-4">
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </button>
              </form>
            </>
          ) : step === "verify" ? (
            <>
              <h1 className="text-lg font-semibold mb-1">Verify your identity</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your real name (the one you used during registration) to verify your identity.
              </p>

              <form onSubmit={handleVerifyName} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Real Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Enter your real name"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); }}
                    className="flex-1 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-1">Set new password</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Create a strong password for your account.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep("verify"); setError(""); }}
                    className="flex-1 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
                  </button>
                </div>
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
