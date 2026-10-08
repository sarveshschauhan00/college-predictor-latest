import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bot, ClipboardList, MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { api, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MiniCollegeCard } from "@/components/CollegeCard";
import { AIMarkdown } from "@/components/ui-bits";

const SUGGEST = ["Which colleges can I get with my score?", "CSE vs ECE — which should I pick?", "What should be my backup colleges?", "How does JoSAA counselling work?", "Which scholarships can I apply for?", "Create my admission plan"];

export default function AICounselor() {
  const { user } = useAuth(); const loc = useLocation(); const nav = useNavigate();
  const [convs, setConvs] = useState([]); const [convId, setConvId] = useState(null); const [msgs, setMsgs] = useState([]); const [input, setInput] = useState(loc.state?.prefill || ""); const [busy, setBusy] = useState(false);
  const bottom = useRef(null);
  useEffect(() => { if (user) api.get("/ai/conversations").then((r) => setConvs(r.data)); }, [user]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const openConv = async (id) => { const { data } = await api.get(`/ai/conversations/${id}`); setConvId(id); setMsgs(data.messages); };
  const newChat = () => { setConvId(null); setMsgs([]); };
  const delConv = async (id) => { await api.delete(`/ai/conversations/${id}`); setConvs((c) => c.filter((x) => x.id !== id)); if (convId === id) newChat(); };

  const send = async (text) => {
    const t = (text ?? input).trim(); if (!t || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "", streaming: true }]);
    try {
      const res = await fetch(`${API}/ai/chat`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t, conversation_id: convId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "AI unavailable");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const ev = JSON.parse(p.slice(6));
          if (ev.type === "start" && ev.conversation_id) setConvId(ev.conversation_id);
          if (ev.type === "delta") setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + ev.content }; return c; });
          if (ev.type === "error") throw new Error(ev.message);
          if (ev.type === "done") { setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], cards: ev.cards, streaming: false }; return c; }); if (user) api.get("/ai/conversations").then((r) => setConvs(r.data)); }
        }
      }
    } catch (e) {
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `⚠️ ${e.message || "The AI counselor is temporarily unavailable. Please try again."}`, error: true }; return c; });
      toast.error(e.message || "AI unavailable");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-4 gap-5 lg:h-[calc(100vh-8rem)]">
      <aside className="hidden lg:flex flex-col card-soft p-3 overflow-hidden" data-testid="ai-conversations-sidebar">
        <button onClick={newChat} className="btn-primary w-full !py-2" data-testid="ai-new-chat-btn"><MessageSquarePlus size={15} />New conversation</button>
        <div className="mt-3 flex-1 overflow-y-auto space-y-1">{!user ? <p className="text-xs text-slate-500 p-2">Log in to save conversations and get personalized answers.</p> : convs.length === 0 ? <p className="text-xs text-slate-500 p-2">No conversations yet.</p> : convs.map((c) => <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm cursor-pointer ${convId === c.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}><button onClick={() => openConv(c.id)} className="flex-1 text-left truncate" data-testid={`ai-conv-${c.id}`}>{c.title}</button><button onClick={() => delConv(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button></div>)}</div>
      </aside>
      <section className="lg:col-span-3 card-soft flex flex-col overflow-hidden min-h-[70vh]">
        <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot size={20} /></span><div><h1 className="font-display text-lg font-extrabold text-slate-900">AI College Counselor</h1><p className="text-xs text-slate-500">Your personal admission & career advisor{user ? ` · personalized for ${user.name.split(" ")[0]}` : " · guest mode"}</p></div><button onClick={() => send("Create my admission plan: a week-by-week action plan with deadlines, shortlist steps and documents.")} className="btn-outline ml-auto hidden sm:inline-flex !py-2" data-testid="ai-create-plan-btn"><ClipboardList size={14} />Create My Admission Plan</button></header>
        <div className="flex-1 overflow-y-auto p-5 space-y-5" data-testid="ai-messages">
          {msgs.length === 0 && <div className="text-center py-10 fade-up"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles size={26} /></span><h2 className="font-display text-xl font-extrabold text-slate-900 mt-4">Ask anything about your college journey</h2><p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Answers are grounded in our cutoff, fee and placement data and personalized to your profile. Estimates — never guarantees.</p><div className="mt-6 flex flex-wrap justify-center gap-2">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="chip chip-off !text-xs" data-testid="ai-suggestion-chip">{s}</button>)}</div>{!user && <button onClick={() => nav("/login")} className="btn-ghost mt-5 !text-sm text-indigo-600">Log in for personalized answers →</button>}</div>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} fade-up`} data-testid={`ai-message-${m.role}`}>
              <div className={`max-w-[85%] ${m.role === "user" ? "rounded-2xl rounded-br-md bg-indigo-600 text-white px-4 py-3 text-sm" : "w-full"}`}>
                {m.role === "user" ? m.content : <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"><Bot size={15} /></span><div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-slate-50 px-4 py-3">
                  {m.content ? <AIMarkdown text={m.content} /> : <span className="flex gap-1 py-1"><span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" /><span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:120ms]" /><span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" /></span>}
                  {m.cards?.length > 0 && <div className="mt-3 flex gap-3 overflow-x-auto hide-scroll pb-1">{m.cards.map((c) => <MiniCollegeCard key={c.slug} c={c} />)}</div>}
                </div></div>}
              </div>
            </div>))}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t border-slate-100 flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. I scored 96 percentile in JEE Main. Which colleges can I get?" className="input-soft !rounded-full flex-1" data-testid="ai-chat-input" disabled={busy} /><button disabled={busy || !input.trim()} className="btn-primary !px-4" data-testid="ai-send-btn"><Send size={16} /></button></form>
      </section>
    </div>
  );
}
