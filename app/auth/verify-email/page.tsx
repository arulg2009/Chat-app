"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Mail, ArrowLeft, Loader2, CheckCircle, RefreshCw, ShieldCheck } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState("");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        if (data.remainingAttempts !== undefined) {
          // Clear OTP on wrong attempt
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
        return;
      }

      setVerified(true);
      // Redirect to signin after 2 seconds
      setTimeout(() => {
        router.push("/auth/signin?verified=true");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !email) return;

    setResending(true);
    setError("");
    setResendSuccess(false);
    setDevOtp("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.waitTime) {
          setCountdown(data.waitTime);
        }
        setError(data.error || "Failed to resend code");
        return;
      }

      setResendSuccess(true);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      // Show dev OTP if available
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Success state
  if (verified) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-xl p-8 border shadow-soft text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold mb-2 text-green-600">Email Verified!</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Your email has been verified successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to sign in...
            </p>
            <Link 
              href="/auth/signin?verified=true" 
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Click here if not redirected
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Link 
          href="/auth/register" 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Register
        </Link>

        <div className="bg-card rounded-xl p-6 border shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>

          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>

            <h1 className="text-lg font-semibold mb-2">Enter verification code</h1>
            <p className="text-sm text-muted-foreground mb-1">
              We sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-foreground mb-6 break-all">
              {email || "your email"}
            </p>

            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={verifying}
                  className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                    error ? "border-red-300 focus:border-red-500" : "border-gray-200 dark:border-gray-700"
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Dev OTP display */}
            {devOtp && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Dev Mode:</strong> Your OTP is <span className="font-mono font-bold">{devOtp}</span>
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Success */}
            {resendSuccess && (
              <div className="text-xs text-green-600 bg-green-500/10 px-3 py-2 rounded-lg mb-4">
                New verification code sent!
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => handleVerify()}
              disabled={verifying || otp.some(d => !d)}
              className="w-full py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 mb-4"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>

            {/* Resend */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResendOtp}
                disabled={resending || countdown > 0 || !email}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </button>
            </div>

            {/* Sign in link */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Already verified?{" "}
                <Link href="/auth/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground mt-6">
          Check your spam folder if you don't see the email
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
