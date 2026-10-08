import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Circle, List, Mail, Plus, Trash2 } from "lucide-react";
import { api, fmtDate, daysLeft } from "@/lib/api";
import { EmptyState, PageHeader } from "@/components/ui-bits";

const STATUSES = ["Not Started", "In Progress", "Submitted", "Accepted", "Rejected"];
const SC = { "Not Started": "bg-slate-100 text-slate-600", "In Progress": "bg-amber-50 text-amber-700", Submitted: "bg-indigo-50 text-indigo-700", Accepted: "bg-emerald-50 text-emerald-700", Rejected: "bg-red-50 text-red-700" };
const KINDS = ["application", "counseling", "document", "result", "seat_allotment", "fee_payment", "scholarship"];

export default function Tracker() {
  const [apps, setApps] = useState(null); const [docs, setDocs] = useState([]); const [view, setView] = useState("list"); const [form, setForm] = useState({ title: "", kind: "application", deadline: "", status: "Not Started" }); const [adding, setAdding] = useState(false); const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const load = () => { api.get("/applications").then((r) => setApps(r.data)); api.get("/documents").then((r) => setDocs(r.data)); };
  useEffect(load, []);
  const add = async (e) => { e.preventDefault(); if (!form.title) return; await api.post("/applications", form); setForm({ title: "", kind: "application", deadline: "", status: "Not Started" }); setAdding(false); toast.success("Added to tracker"); load(); };
  const setStatus = async (a, status) => { await api.patch(`/applications/${a.id}`, { status }); load(); };
  const del = async (a) => { await api.delete(`/applications/${a.id}`); load(); };
  const toggleDoc = async (d) => { await api.patch(`/documents/${d.id}`, { done: !d.done }); load(); };
  const emailDigest = async () => { try { const { data } = await api.post("/notifications/email-digest"); toast.success(`Emailed ${data.count} deadlines to you`); } catch (e) { toast.error(e.response?.data?.detail || "Could not send email"); } };
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const pad = month.getDay();
  return (
    <div>
      <PageHeader eyebrow="Admission tracker" title="Track every application & deadline" subtitle="Applications, counselling rounds, documents, results, seat allotment and fee payments in one place." action={<div className="flex gap-2"><button onClick={emailDigest} className="btn-outline" data-testid="tracker-email-digest-btn"><Mail size={15} />Email me deadlines</button><button onClick={() => setAdding(!adding)} className="btn-primary" data-testid="tracker-add-btn"><Plus size={15} />Add item</button></div>} />
      {adding && <form onSubmit={add} className="card-soft p-5 mb-6 grid sm:grid-cols-5 gap-3 fade-up" data-testid="tracker-add-form"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. JoSAA Round 2 choice filling" className="input-soft sm:col-span-2" data-testid="tracker-title-input" required /><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="input-soft" data-testid="tracker-kind-select">{KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input-soft" data-testid="tracker-deadline-input" /><button className="btn-primary" data-testid="tracker-save-btn">Save</button></form>}
      <div className="flex gap-2 mb-5"><button onClick={() => setView("list")} className={`chip ${view === "list" ? "chip-on" : "chip-off"}`} data-testid="tracker-view-list"><List size={14} className="inline mr-1" />List</button><button onClick={() => setView("calendar")} className={`chip ${view === "calendar" ? "chip-on" : "chip-off"}`} data-testid="tracker-view-calendar"><Calendar size={14} className="inline mr-1" />Calendar</button></div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!apps ? <div className="skeleton h-64" /> : view === "list" ? (apps.length === 0 ? <EmptyState title="Nothing tracked yet" text="Add your first application, counselling round or document deadline." testId="tracker-empty" /> : <div className="space-y-3">{apps.map((a) => { const dl = daysLeft(a.deadline); return (
            <div key={a.id} className="card-soft p-4 flex flex-col sm:flex-row sm:items-center gap-3 fade-up" data-testid={`tracker-item-${a.id}`}>
              <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{a.title}</p><p className="text-xs text-slate-500 mt-0.5 capitalize">{a.kind.replace("_", " ")} · {a.deadline ? `${fmtDate(a.deadline)}${dl !== null ? dl < 0 ? " · expired" : ` · ${dl}d left` : ""}` : "No deadline"}</p></div>
              <select value={a.status} onChange={(e) => setStatus(a, e.target.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold border-0 ${SC[a.status]}`} data-testid={`tracker-status-${a.id}`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <button onClick={() => del(a)} className="text-slate-400 hover:text-red-600" data-testid={`tracker-delete-${a.id}`}><Trash2 size={16} /></button>
            </div>); })}</div>) : (
            <div className="card-soft p-5 fade-up" data-testid="tracker-calendar">
              <div className="flex items-center justify-between mb-4"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn-ghost">←</button><p className="font-display font-bold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn-ghost">→</button></div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400 mb-1">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">{Array.from({ length: pad }).map((_, i) => <span key={`p${i}`} />)}{days.map((d) => { const key = d.toISOString().slice(0, 10); const items = apps.filter((a) => a.deadline === key); return <div key={key} className={`min-h-[64px] rounded-lg border p-1 text-xs ${items.length ? "border-indigo-200 bg-indigo-50/60" : "border-slate-100"}`}><p className="text-slate-500">{d.getDate()}</p>{items.map((a) => <p key={a.id} className="truncate font-semibold text-indigo-700" title={a.title}>{a.title}</p>)}</div>; })}</div>
            </div>)}
        </div>
        <div className="card-soft p-5 h-fit fade-up delay-2" data-testid="document-checklist">
          <div className="flex items-center justify-between"><h2 className="font-display font-bold">Document checklist</h2><span className="pill bg-slate-100 text-slate-600">{docs.filter((d) => d.done).length}/{docs.length}</span></div>
          <ul className="mt-3 space-y-2">{docs.map((d) => <li key={d.id}><button onClick={() => toggleDoc(d)} className="flex items-center gap-2.5 text-sm w-full text-left" data-testid={`doc-toggle-${d.id}`}>{d.done ? <CheckCircle2 size={17} className="text-emerald-500 shrink-0" /> : <Circle size={17} className="text-slate-300 shrink-0" />}<span className={d.done ? "line-through text-slate-400" : "text-slate-700"}>{d.name}</span></button></li>)}</ul>
          <form onSubmit={async (e) => { e.preventDefault(); const n = e.target.doc.value.trim(); if (!n) return; await api.post("/documents", { name: n }); e.target.reset(); load(); }} className="mt-4 flex gap-2"><input name="doc" placeholder="Add document" className="input-soft !py-2 !text-xs" data-testid="doc-add-input" /><button className="btn-outline !px-3 !py-1.5 !text-xs" data-testid="doc-add-btn">Add</button></form>
        </div>
      </div>
    </div>
  );
}
