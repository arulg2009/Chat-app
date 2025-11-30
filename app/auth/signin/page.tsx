"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, MessageCircle, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const registered = searchParams?.get("registered");
  const verified = searchParams?.get("verified");

  useEffect(() => {
    if (registered === "true") {
      setSuccessMessage("Account created! Please check your email to verify your account.");
    } else if (verified === "true") {
      setSuccessMessage("Email verified successfully! You can now sign in.");
    }
  }, [registered, verified]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        // Check for specific error messages
        if (result.error.includes("verify") || result.error.includes("Verify")) {
          setError("Please verify your email before signing in. Check your inbox for the verification link.");
        } else if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-sm w-full space-y-5 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-soft-lg border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold gradient-text">Welcome Back</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sign in to continue to ChatApp</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span>{error}</span>
              {error.includes("verify") && (
                <Link 
                  href={`/auth/verify-email?email=${encodeURIComponent(email)}`}
                  className="block mt-1 text-primary hover:underline"
                >
                  Resend verification email
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Create account
          </Link>
        </p>

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Secure & encrypted connection
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
