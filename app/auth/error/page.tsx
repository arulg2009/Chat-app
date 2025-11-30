"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, AlertCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; desc: string }> = {
    Configuration: {
      title: "Configuration Error",
      desc: "There's a problem with the server configuration. Please contact support.",
    },
    AccessDenied: {
      title: "Access Denied",
      desc: "You don't have permission to access this resource.",
    },
    Verification: {
      title: "Verification Failed",
      desc: "The verification link may have expired or is invalid.",
    },
    OAuthSignin: {
      title: "OAuth Sign-in Error",
      desc: "Error occurred while signing in with the provider.",
    },
    OAuthCallback: {
      title: "OAuth Callback Error",
      desc: "Error occurred during the OAuth callback.",
    },
    OAuthCreateAccount: {
      title: "Account Creation Failed",
      desc: "Could not create account using OAuth provider.",
    },
    EmailCreateAccount: {
      title: "Account Creation Failed",
      desc: "Could not create account using email.",
    },
    Callback: {
      title: "Callback Error",
      desc: "Error occurred during authentication callback.",
    },
    OAuthAccountNotLinked: {
      title: "Account Not Linked",
      desc: "Email already exists with a different provider.",
    },
    EmailSignin: {
      title: "Email Sign-in Error",
      desc: "Could not send the sign-in email.",
    },
    CredentialsSignin: {
      title: "Invalid Credentials",
      desc: "The email or password you entered is incorrect.",
    },
    SessionRequired: {
      title: "Session Required",
      desc: "Please sign in to access this page.",
    },
    Default: {
      title: "Authentication Error",
      desc: "An unexpected error occurred. Please try again.",
    },
  };

  const { title, desc } = errorMessages[error || ""] || errorMessages.Default;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-xl p-6 border shadow-soft text-center">
          <div className="flex items-center gap-2 justify-center mb-6">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>

          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>

          <h1 className="text-lg font-semibold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{desc}</p>

          {error && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-4 font-mono">
              Error: {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Link
              href="/auth/signin"
              className="w-full py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Try Again
            </Link>
            <Link
              href="/"
              className="w-full py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Need help?{" "}
          <a href="mailto:support@chatapp.com" className="text-primary hover:underline">Contact Support</a>
        </p>
      </div>
    </main>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <ErrorContent />
    </Suspense>
  );
}
