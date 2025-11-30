"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
        setError(result.error === "CredentialsSignin" 
          ? "Invalid email or password. Please try again." 
          : result.error);
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
      <div className="max-w-sm w-full space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-soft-lg border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold gradient-text">Welcome Back</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sign in to continue</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
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
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
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
                className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">Sign up</Link>
        </p>

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Encrypted & secure
          </p>
        </div>
      </div>
    </div>
  );
}
