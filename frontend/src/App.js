import { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Predictor from "@/pages/Predictor";
import Predictions from "@/pages/Predictions";
import Colleges from "@/pages/Colleges";
import CollegeDetail from "@/pages/CollegeDetail";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import ExamDetail from "@/pages/ExamDetail";
import Compare from "@/pages/Compare";
import Cutoffs from "@/pages/Cutoffs";
import Scholarships from "@/pages/Scholarships";
import { FeesPage, ROIPage } from "@/pages/Calculators";
import Tracker from "@/pages/Tracker";
import Shortlist from "@/pages/Shortlist";
import AICounselor from "@/pages/AICounselor";
import { ProfilePage, NotificationsPage, SettingsPage } from "@/pages/Account";
import Admin from "@/pages/Admin";

function AuthCallback() {
  const done = useRef(false); const nav = useNavigate(); const { setUser } = useAuth();
  useEffect(() => {
    if (done.current) return; done.current = true;
    const sid = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sid });
        setUser(data.user);
        window.history.replaceState(null, "", window.location.pathname);
        nav(data.user.onboarded ? "/dashboard" : "/onboarding", { replace: true, state: { user: data.user } });
      } catch { nav("/login", { replace: true }); }
    })();
  }, [nav, setUser]);
  return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Signing you in…</div>;
}

function Protected({ children, admin }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm" data-testid="auth-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (admin && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

const L = (el) => <Layout>{el}</Layout>;

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="/dashboard" element={<Protected>{L(<Dashboard />)}</Protected>} />
      <Route path="/predictor" element={L(<Predictor />)} />
      <Route path="/predictions" element={L(<Predictions />)} />
      <Route path="/colleges" element={L(<Colleges />)} />
      <Route path="/college/:slug" element={L(<CollegeDetail />)} />
      <Route path="/colleges/:slug" element={L(<CollegeDetail />)} />
      <Route path="/courses" element={L(<Courses />)} />
      <Route path="/course/:slug" element={L(<CourseDetail />)} />
      <Route path="/courses/:slug" element={L(<CourseDetail />)} />
      <Route path="/exams/:slug" element={L(<ExamDetail />)} />
      <Route path="/compare" element={L(<Compare />)} />
      <Route path="/cutoffs" element={L(<Cutoffs />)} />
      <Route path="/scholarships" element={L(<Scholarships />)} />
      <Route path="/fees" element={L(<FeesPage />)} />
      <Route path="/roi" element={L(<ROIPage />)} />
      <Route path="/tracker" element={<Protected>{L(<Tracker />)}</Protected>} />
      <Route path="/shortlist" element={<Protected>{L(<Shortlist />)}</Protected>} />
      <Route path="/ai-counselor" element={L(<AICounselor />)} />
      <Route path="/profile" element={<Protected>{L(<ProfilePage />)}</Protected>} />
      <Route path="/notifications" element={<Protected>{L(<NotificationsPage />)}</Protected>} />
      <Route path="/settings" element={<Protected>{L(<SettingsPage />)}</Protected>} />
      <Route path="/admin" element={<Protected admin>{L(<Admin />)}</Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
