import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { GraduationCap, Mail, Lock, User, Compass } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Layout";

export default function Login() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { setUser, loginWithGoogle } = useAuth();
  const nav = useNavigate(); const loc = useLocation();
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post(mode === "signup" ? "/auth/register" : "/auth/login", form);
      setUser(data.user);
      toast.success(mode === "signup" ? "Welcome to CollegePredict AI!" : `Welcome back, ${data.user.name.split(" ")[0]}`);
      nav(data.user.role === "admin" ? "/admin" : data.user.onboarded ? loc.state?.from || "/dashboard" : "/onboarding");
    } catch (err) { toast.error(err.response?.data?.detail || "Something went wrong"); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <Brand dark />
        <div className="relative"><h2 className="font-display text-4xl font-extrabold leading-tight">Your AI-powered path to the right college.</h2><p className="mt-4 text-slate-300 max-w-md">Enter your profile once. Get predictions, counselling, shortlists, scholarships and deadlines — all personalized.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">{[["40+", "Colleges"], ["18", "Exams"], ["8K+", "Cutoffs"]].map(([v, l]) => <div key={l} className="rounded-2xl bg-white/5 border border-white/10 p-4"><p className="font-display text-2xl font-extrabold">{v}</p><p className="text-xs text-slate-400">{l}</p></div>)}</div></div>
        <p className="text-xs text-slate-500">Predictions are estimates based on historical trends, never guarantees.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#FAFAFC]">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden mb-8"><Brand /></div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{mode === "signup" ? "Start predicting colleges in under 2 minutes." : "Log in to continue your admission journey."}</p>
          <button onClick={() => loginWithGoogle("/dashboard")} className="btn-outline w-full mt-7 !py-3" data-testid="google-login-btn">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or with email<span className="h-px flex-1 bg-slate-200" /></div>
          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "signup" && <div><label className="label-soft">Full name</label><div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-soft !pl-9" placeholder="Ananya Sharma" data-testid="auth-name-input" /></div></div>}
            <div><label className="label-soft">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-soft !pl-9" placeholder="you@example.com" data-testid="auth-email-input" /></div></div>
            <div><label className="label-soft">Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-soft !pl-9" placeholder="••••••••" data-testid="auth-password-input" /></div></div>
            <button disabled={busy} className="btn-primary w-full !py-3" data-testid="auth-submit-btn">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</button>
          </form>
          <p className="mt-5 text-sm text-slate-600 text-center">{mode === "signup" ? "Already have an account?" : "New here?"} <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="font-semibold text-indigo-600" data-testid="auth-toggle-mode-btn">{mode === "signup" ? "Log in" : "Create an account"}</button></p>
          <p className="mt-2 text-xs text-slate-400 text-center">Phone OTP login is coming soon.</p>
          <Link to="/predictor" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700" data-testid="guest-explore-link"><Compass size={16} />Explore as a guest</Link>
          <p className="mt-6 text-center text-[11px] text-slate-400">Demo student: student@demo.com / Student@123</p>
        </div>
      </div>
    </div>
  );
}
