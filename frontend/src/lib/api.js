import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

export const fmtMoney = (v) => {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
export const fmtLPA = (v) => (v === null || v === undefined ? "—" : `₹${v} LPA`);
export const fmtNum = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null);

export const CATEGORIES = ["General", "EWS", "OBC", "SC", "ST"];
export const STATES = ["Delhi", "Maharashtra", "Tamil Nadu", "Karnataka", "Uttar Pradesh", "West Bengal", "Telangana", "Rajasthan", "Gujarat", "Madhya Pradesh", "Kerala", "Punjab", "Haryana", "Bihar", "Andhra Pradesh", "Odisha", "Assam", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh", "Goa"];

export const metricLabel = (exam) => {
  if (!exam) return "Score";
  if (["mht-cet", "cat"].includes(exam.slug)) return "Percentile";
  if (exam.metric_type === "percentile") return "Percentile";
  if (exam.metric_type === "score") return `Marks (out of ${exam.score_max})`;
  return "Rank (AIR)";
};

const COMPARE_KEY = "cp_compare";
export const compareStore = {
  get: () => { try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"); } catch { return []; } },
  set: (arr) => { localStorage.setItem(COMPARE_KEY, JSON.stringify(arr.slice(0, 4))); window.dispatchEvent(new Event("cp-compare")); },
  toggle: (slug) => { const a = compareStore.get(); compareStore.set(a.includes(slug) ? a.filter((s) => s !== slug) : [...a, slug]); return !a.includes(slug); },
};
