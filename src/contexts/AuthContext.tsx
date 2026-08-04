import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (args: { email: string; password: string; fullName: string; role: AppRole }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REMEMBER_KEY = "sms.rememberMe";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserMeta = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile((profileRes.data as Profile) ?? null);
    setRole(((roleRes.data?.role as AppRole) ?? null));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }
      // Defer supabase calls out of the callback to avoid deadlocks.
      setTimeout(() => {
        loadUserMeta(nextSession.user.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadUserMeta(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserMeta]);

  const logActivity = useCallback(async (action: string, description: string, userId: string, actorName?: string | null) => {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      actor_name: actorName ?? null,
      action,
      entity_type: "auth",
      description,
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
      if (data.user) await logActivity("login", `${email} signed in`, data.user.id, email);
    },
    [logActivity],
  );

  const signUp = useCallback(
    async ({ email, password, fullName, role: newRole }: { email: string; password: string; fullName: string; role: AppRole }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { full_name: fullName, role: newRole },
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (user) await logActivity("logout", `${user.email} signed out`, user.id, user.email);
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  }, [user, logActivity]);

  const forgotPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    if (user) await logActivity("password_changed", "Password updated", user.id, user.email);
  }, [user, logActivity]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserMeta(user.id);
  }, [user, loadUserMeta]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, profile, role, loading, signIn, signUp, signOut, forgotPassword, updatePassword, refreshProfile }),
    [user, session, profile, role, loading, signIn, signUp, signOut, forgotPassword, updatePassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
