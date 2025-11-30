"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Check, AtSign } from "lucide-react";

export default function RegisterPage() {
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!realName.trim()) {
      setError("Please enter your real name");
      return;
    }
    if (realName.trim().length < 2) {
      setError("Real name must be at least 2 characters");
      return;
    }
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }
    if (nickname.trim().length < 2) {
      setError("Nickname must be at least 2 characters");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          realName: realName.trim(),
          nickname: nickname.trim(),
          email: email.trim().toLowerCase(),
          password 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      
      // Redirect to verification page with email
      router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength();
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <div className="bg-card rounded-xl p-6 border shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>

          <h1 className="text-lg font-semibold mb-1">Create account</h1>
          <p className="text-sm text-muted-foreground mb-5">Join ChatApp for free</p>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Used for account recovery</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nickname *</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Display name"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">This is how others will see you</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
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

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {strength === 0 && "Weak"}{strength === 1 && "Fair"}{strength === 2 && "Good"}{strength === 3 && "Strong"}{strength === 4 && "Excellent"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                />
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Account"}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-[10px] text-center text-muted-foreground mt-6">
          By creating an account, you agree to our Terms of Service
        </p>
      </div>
    </main>
  );
}
