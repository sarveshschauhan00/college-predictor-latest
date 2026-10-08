import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Trash2, Users } from "lucide-react";
import { api, CATEGORIES, STATES, fmtMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, PageHeader } from "@/components/ui-bits";

export function ProfilePage() {
  const { user } = useAuth(); const [p, setP] = useState(null); const [exams, setExams] = useState([]);
  useEffect(() => { api.get("/profile").then((r) => setP(r.data)); api.get("/exams").then((r) => setExams(r.data)); }, []);
  if (!p) return <div className="skeleton h-96" />;
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); try { await api.put("/profile", { ...p, rank: p.rank ? Number(p.rank) : null, percentile: p.percentile ? Number(p.percentile) : null, score: p.score ? Number(p.score) : null, budget: p.budget ? Number(p.budget) : null }); toast.success("Profile saved — predictions updated"); } catch { toast.error("Could not save"); } };
  const exam = exams.find((e) => e.id === p.exam_id);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Profile" title={user.name} subtitle={`${user.email} · ${user.plan === "premium" ? "Premium" : "Free plan"}`} action={<Link to="/onboarding" className="btn-outline" data-testid="profile-rerun-onboarding-btn">Re-run onboarding wizard</Link>} />
      <form onSubmit={save} className="card-soft p-6 grid sm:grid-cols-2 gap-4 fade-up" data-testid="profile-form">
        <div><label className="label-soft">Class / year</label><input value={p.class_year || ""} onChange={(e) => set("class_year", e.target.value)} className="input-soft" data-testid="profile-class-input" /></div>
        <div><label className="label-soft">Home state</label><select value={p.home_state || ""} onChange={(e) => { set("home_state", e.target.value); set("state", e.target.value); }} className="input-soft" data-testid="profile-state-select"><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label-soft">Exam</label><select value={p.exam_id || ""} onChange={(e) => set("exam_id", e.target.value)} className="input-soft" data-testid="profile-exam-select"><option value="">Select</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
        {exam?.metric_type === "score" ? <div><label className="label-soft">Score / marks</label><input type="number" value={p.score ?? ""} onChange={(e) => set("score", e.target.value)} className="input-soft font-mono" data-testid="profile-score-input" /></div> : <><div><label className="label-soft">Percentile</label><input type="number" step="0.01" value={p.percentile ?? ""} onChange={(e) => set("percentile", e.target.value)} className="input-soft font-mono" data-testid="profile-percentile-input" /></div><div><label className="label-soft">Rank</label><input type="number" value={p.rank ?? ""} onChange={(e) => set("rank", e.target.value)} className="input-soft font-mono" data-testid="profile-rank-input" /></div></>}
        <div><label className="label-soft">Category</label><select value={p.category || "General"} onChange={(e) => set("category", e.target.value)} className="input-soft" data-testid="profile-category-select">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label-soft">Gender</label><select value={p.gender || ""} onChange={(e) => set("gender", e.target.value)} className="input-soft"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></div>
        <div><label className="label-soft">Annual budget (₹)</label><input type="number" value={p.budget ?? ""} onChange={(e) => set("budget", e.target.value)} className="input-soft font-mono" data-testid="profile-budget-input" /></div>
        <div><label className="label-soft">Preferred courses (comma separated)</label><input value={(p.preferred_courses || []).join(", ")} onChange={(e) => set("preferred_courses", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="input-soft" data-testid="profile-courses-input" /></div>
        <div className="sm:col-span-2"><label className="label-soft">Career goal</label><textarea rows={2} value={p.career_goal || ""} onChange={(e) => set("career_goal", e.target.value)} className="input-soft" /></div>
        <div className="sm:col-span-2 flex justify-end"><button className="btn-primary" data-testid="profile-save-btn">Save profile</button></div>
      </form>
    </div>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/notifications").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const readAll = async () => { await api.post("/notifications/read-all"); load(); };
  const K = { deadline: "bg-red-50 text-red-700", scholarship: "bg-emerald-50 text-emerald-700", info: "bg-indigo-50 text-indigo-700" };
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Notifications" title="Your updates" subtitle="Deadlines, cutoff updates, scholarships and saved-college changes." action={<button onClick={readAll} className="btn-outline" data-testid="notifications-read-all-btn">Mark all read</button>} />
      {!items ? <div className="skeleton h-40" /> : items.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" text="We'll notify you about deadlines, cutoffs and scholarships here." /> : <ul className="space-y-3">{items.map((n) => <li key={n.id} className={`card-soft p-4 flex gap-3 ${n.read ? "opacity-70" : ""}`} data-testid={`notification-${n.id}`}><span className={`pill h-fit ${K[n.kind] || K.info}`}>{n.kind}</span><div className="flex-1"><p className="font-semibold text-slate-900">{n.title}</p><p className="text-sm text-slate-600">{n.body}</p>{n.link && <Link to={n.link} className="text-xs font-semibold text-indigo-600 mt-1 inline-block">Open →</Link>}</div>{!n.read && <span className="h-2 w-2 rounded-full bg-indigo-600 mt-2" />}</li>)}</ul>}
    </div>
  );
}

export function SettingsPage() {
  const { user, setUser } = useAuth(); const nav = useNavigate();
  const [p, setP] = useState(null); const [parent, setParent] = useState(null);
  useEffect(() => { api.get("/profile").then((r) => setP({ notification_prefs: { email: true, in_app: true, push: false, whatsapp: false }, ...r.data })); }, []);
  const savePrefs = async (prefs) => { setP({ ...p, notification_prefs: prefs }); await api.put("/profile", { notification_prefs: prefs }); toast.success("Preferences saved"); };
  const saveParent = async () => { await api.put("/profile", { parent_email: p.parent_email || "", parent_share_ai: !!p.parent_share_ai }); toast.success("Parent access updated"); };
  const loadParent = async () => { const { data } = await api.get("/parent/view"); setParent(data); };
  const delAccount = async () => { if (!window.confirm("Delete your account and all data? This cannot be undone.")) return; await api.delete("/account"); setUser(null); toast.success("Account deleted"); nav("/"); };
  if (!p) return <div className="skeleton h-96" />;
  const prefs = p.notification_prefs || {};
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Account & preferences" />
      <section className="card-soft p-6 fade-up" data-testid="settings-notifications"><h2 className="font-display font-bold text-lg">Notification channels</h2><p className="text-sm text-slate-500">Deadline reminders, cutoff updates, result alerts and scholarship deadlines.</p><div className="mt-4 grid sm:grid-cols-2 gap-3">{[["in_app", "In-app"], ["email", "Email"], ["push", "Push notifications"], ["whatsapp", "WhatsApp (where supported)"]].map(([k, l]) => <label key={k} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"><span>{l}</span><input type="checkbox" checked={!!prefs[k]} onChange={(e) => savePrefs({ ...prefs, [k]: e.target.checked })} className="accent-indigo-600 h-4 w-4" data-testid={`pref-${k}`} /></label>)}</div></section>
      <section className="card-soft p-6 fade-up delay-1" data-testid="settings-parent"><h2 className="font-display font-bold text-lg flex items-center gap-2"><Users size={18} />Parent mode</h2><p className="text-sm text-slate-500">Parents can see your shortlist, fees, deadlines and progress. AI conversations stay private unless you share them.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3"><input type="email" placeholder="parent@example.com" value={p.parent_email || ""} onChange={(e) => setP({ ...p, parent_email: e.target.value })} className="input-soft" data-testid="parent-email-input" /><label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={!!p.parent_share_ai} onChange={(e) => setP({ ...p, parent_share_ai: e.target.checked })} className="accent-indigo-600" data-testid="parent-share-ai-toggle" />Share AI chats</label><button onClick={saveParent} className="btn-outline" data-testid="parent-save-btn">Save</button><button onClick={loadParent} className="btn-ghost" data-testid="parent-preview-btn">Preview parent view</button></div>
        {parent && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm fade-up" data-testid="parent-view"><p className="font-semibold">What {parent.parent_email || "a parent"} would see for {parent.student.name}:</p><p className="mt-2 text-slate-600">Budget: <b>{fmtMoney(parent.budget)}</b>/yr · Shortlist: <b>{parent.shortlist.length}</b> colleges · Applications: <b>{parent.applications.length}</b> · AI chats: <b>{parent.share_ai ? "shared" : "private"}</b></p><ul className="mt-2 space-y-1">{parent.shortlist.slice(0, 5).map((s) => <li key={s.id} className="flex justify-between"><span>{s.college?.short_name} — {s.course?.name}</span><span className="font-mono">{fmtMoney(s.college?.fee_annual)}/yr</span></li>)}</ul></div>}
      </section>
      <section className="card-soft p-6 fade-up delay-2 border-red-100"><h2 className="font-display font-bold text-lg text-red-700">Danger zone</h2><p className="text-sm text-slate-500">Permanently delete your account, profile, shortlist, tracker and AI conversations.</p><button onClick={delAccount} className="btn-outline mt-4 !border-red-300 !text-red-700 hover:!bg-red-50" data-testid="delete-account-btn"><Trash2 size={15} />Delete my account & data</button></section>
    </div>
  );
}
