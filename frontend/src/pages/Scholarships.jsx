import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Bookmark, ExternalLink, Award } from "lucide-react";
import { api, CATEGORIES, fmtMoney, fmtDate, daysLeft } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, PageHeader, SkeletonCards } from "@/components/ui-bits";

export default function Scholarships() {
  const { user } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ category: "Any", gender: "Any", max_income: "", q: "" }); const [items, setItems] = useState(null);
  useEffect(() => { if (user) api.get("/profile").then((r) => setF((x) => ({ ...x, category: r.data?.category || "Any", gender: r.data?.gender || "Any" }))).catch(() => {}); }, [user]);
  useEffect(() => { setItems(null); api.get("/scholarships", { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v && v !== "Any")) }).then((r) => setItems(r.data)); }, [f]);
  const act = async (s, kind) => {
    if (!user) { toast("Login to save scholarships"); return nav("/login"); }
    try { await api.post("/applications", { title: `${s.name} — ${kind === "reminder" ? "reminder" : "application"}`, kind: "scholarship", status: "Not Started", deadline: s.deadline, notes: s.link }); toast.success(kind === "reminder" ? "Reminder added to your tracker" : "Scholarship saved to tracker"); }
    catch { toast.error("Could not save"); }
  };
  return (
    <div>
      <PageHeader eyebrow="Scholarship finder" title="Find scholarships you qualify for" subtitle="Filtered by category, gender and family income. Save them to your tracker or set a reminder." />
      <div className="card-soft p-4 mb-6 grid sm:grid-cols-4 gap-3 fade-up delay-1">
        <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search scholarships…" className="input-soft" data-testid="scholarship-search-input" />
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="input-soft" data-testid="scholarship-category-select"><option>Any</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className="input-soft" data-testid="scholarship-gender-select"><option>Any</option><option>Female</option><option>Male</option></select>
        <select value={f.max_income} onChange={(e) => setF({ ...f, max_income: e.target.value })} className="input-soft" data-testid="scholarship-income-select"><option value="">Any family income</option><option value="250000">Up to ₹2.5L</option><option value="450000">Up to ₹4.5L</option><option value="800000">Up to ₹8L</option><option value="1500000">Up to ₹15L</option></select>
      </div>
      {!items ? <SkeletonCards n={6} /> : items.length === 0 ? <EmptyState icon={Award} title="No scholarships match" text="Try relaxing the filters." testId="scholarships-empty" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((s, i) => { const dl = daysLeft(s.deadline); return (
        <div key={s.id} className="card-soft card-hover p-5 fade-up flex flex-col" style={{ animationDelay: `${i * 40}ms` }} data-testid={`scholarship-card-${s.id}`}>
          <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-slate-500">{s.provider}</p><h3 className="font-display font-bold text-slate-900 leading-tight mt-0.5">{s.name}</h3></div><span className={`pill ${dl < 0 ? "bg-slate-100 text-slate-500" : dl < 30 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{dl < 0 ? "Expired" : s.status}</span></div>
          <p className="font-display text-2xl font-extrabold text-indigo-700 mt-3">{fmtMoney(s.amount)}<span className="text-xs font-semibold text-slate-500"> / year</span></p>
          <p className="text-sm text-slate-600 mt-2">{s.eligibility}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{s.categories.slice(0, 5).map((c) => <span key={c} className="pill bg-slate-100 text-slate-600 !text-[10px]">{c}</span>)}{s.gender !== "All" && <span className="pill bg-pink-50 text-pink-700 !text-[10px]">{s.gender}</span>}</div>
          <p className="mt-3 text-xs text-slate-500">Deadline: <b className="text-slate-800">{fmtDate(s.deadline)}</b>{dl >= 0 && ` · ${dl} days left`}</p>
          <p className="text-xs text-slate-500 mt-1">Documents: {s.documents.join(", ")}</p>
          <div className="mt-auto pt-4 flex flex-wrap gap-2"><button onClick={() => act(s, "save")} className="btn-outline !px-3.5 !py-1.5 !text-xs" data-testid={`scholarship-save-${s.id}`}><Bookmark size={13} />Save</button><button onClick={() => act(s, "reminder")} className="btn-ghost" data-testid={`scholarship-remind-${s.id}`}><Bell size={13} />Set reminder</button><a href={s.link} target="_blank" rel="noreferrer" className="btn-ghost ml-auto" data-testid={`scholarship-apply-${s.id}`}>Apply<ExternalLink size={13} /></a></div>
        </div>); })}</div>}
    </div>
  );
}
