"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Mail, ArrowLeft, Loader2, CheckCircle, RefreshCw } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  const token = searchParams?.get("token") || "";
  
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // If token is provided, verify it
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyToken = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerified(true);
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin?verified=true");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0 || !email) return;
    
    setResending(true);
    setError("");
    setResendSuccess(false);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend email");
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  // If verifying with token
  if (token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-xl p-6 border shadow-soft text-center">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              {verifying ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : verified ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Mail className="w-6 h-6 text-white" />
              )}
            </div>

            {verifying && (
              <>
                <h1 className="text-lg font-semibold mb-2">Verifying your email...</h1>
                <p className="text-sm text-muted-foreground">Please wait while we verify your email address.</p>
              </>
            )}

            {verified && (
              <>
                <h1 className="text-lg font-semibold mb-2 text-green-600">Email Verified!</h1>
                <p className="text-sm text-muted-foreground mb-4">Your email has been verified successfully. Redirecting to sign in...</p>
                <Link href="/auth/signin" className="text-sm text-primary hover:underline">
                  Click here if not redirected
                </Link>
              </>
            )}

            {error && !verifying && (
              <>
                <h1 className="text-lg font-semibold mb-2 text-red-600">Verification Failed</h1>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Link href="/auth/signin" className="text-sm text-primary hover:underline">
                  Go to Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Show verification pending page
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Register
        </Link>

        <div className="bg-card rounded-xl p-6 border shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>

          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>

            <h1 className="text-lg font-semibold mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-2">
              We've sent a verification link to:
            </p>
            <p className="text-sm font-medium text-foreground mb-6 break-all">
              {email || "your email address"}
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> The email may take a few minutes to arrive. 
                Please check your spam folder if you don't see it.
              </p>
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="text-xs text-green-600 bg-green-500/10 px-3 py-2 rounded-lg mb-4">
                Verification email sent successfully!
              </div>
            )}

            <button
              onClick={handleResendEmail}
              disabled={resending || countdown > 0 || !email}
              className="w-full py-2.5 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {resending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend verification email"}
            </button>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Already verified?
              </p>
              <Link 
                href="/auth/signin" 
                className="text-sm font-medium text-primary hover:underline"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground mt-6">
          Having trouble? Contact support@chatapp.com
        </p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
