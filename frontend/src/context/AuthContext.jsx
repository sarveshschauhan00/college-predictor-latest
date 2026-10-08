import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { const { data } = await api.get("/auth/me"); setUser(data); return data; }
    catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // CRITICAL: skip /me if returning from OAuth; AuthCallback will exchange session_id first.
    if (window.location.hash?.includes("session_id=")) { setLoading(false); return; }
    refresh();
  }, [refresh]);

  const logout = async () => { await api.post("/auth/logout"); setUser(null); };
  const loginWithGoogle = (next = "/dashboard") => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + next;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return <AuthCtx.Provider value={{ user, setUser, loading, refresh, logout, loginWithGoogle }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
