"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Home, MessageCircle } from "lucide-react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; message: string }> = {
    Configuration: {
      title: "Configuration Error",
      message: "There is a problem with the server configuration. Please contact support.",
    },
    AccessDenied: {
      title: "Access Denied",
      message: "You do not have permission to sign in. Please check your credentials.",
    },
    Verification: {
      title: "Verification Failed",
      message: "The verification token has expired or has already been used.",
    },
    CredentialsSignin: {
      title: "Sign In Failed",
      message: "Invalid email or password. Please check your credentials and try again.",
    },
    Default: {
      title: "Authentication Error",
      message: "An error occurred during authentication. Please try again.",
    },
  };

  const errorInfo = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Chat
          </span>
        </div>

        {/* Error Icon */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {errorInfo.title}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {errorInfo.message}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Link
            href="/auth/signin"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          Need help?{" "}
          <span className="text-blue-600 hover:underline cursor-pointer">
            Contact Support
          </span>
        </p>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
