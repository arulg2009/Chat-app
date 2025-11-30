"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Zap, Shield, Users, Lock, ArrowRight, Check } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass glass-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">ChatApp</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="px-4 py-1.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Zap className="w-3 h-3" /> Fast & Secure Messaging
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Connect with anyone,{" "}
            <span className="gradient-text">anywhere</span>
          </h1>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            A modern chat platform for seamless communication. Send messages, share media, and stay connected with friends and teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-opacity">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signin" className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-8">Why choose ChatApp?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Real-time messaging with instant delivery", color: "from-blue-500 to-cyan-500" },
              { icon: Shield, title: "Secure & Private", desc: "End-to-end encryption for all messages", color: "from-green-500 to-emerald-500" },
              { icon: Users, title: "Group Chats", desc: "Create groups and collaborate easily", color: "from-violet-500 to-purple-500" },
            ].map((f, i) => (
              <div key={i} className="bg-card p-5 rounded-xl border shadow-soft hover:shadow-soft-lg transition-shadow">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center mb-3`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl p-6 md:p-10 border shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Your Privacy Matters</h2>
                <p className="text-sm text-muted-foreground">We take security seriously</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {["End-to-End Encryption", "No Data Selling", "Secure Authentication"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Join now and start connecting. Free to use.</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-opacity">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium gradient-text">ChatApp</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground">
              Built by <span className="font-medium text-foreground">Karthikeyan G</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 ChatApp</p>
        </div>
      </footer>
    </main>
  );
}
