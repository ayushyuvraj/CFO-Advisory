"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CompanyPersona,
  CompanyProfile,
  PersonaPermissions,
} from "@/lib/governance/types";

export type AuthMethod =
  | "credentials"
  | "client_credentials"
  | "kpmg_preview";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  email: string;
  method: AuthMethod;
  badge: string;
  tenantType?: "kpmg" | "client";
  companyId?: string;
  companyName?: string;
  personaId?: string;
  permissions?: PersonaPermissions;
  allowedProductIds?: string[];
  previewOriginalAdmin?: AuthUser | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoginOpen: boolean;
  isPreviewMode: boolean;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  signInWithCredentials: (email: string, passcode: string) => Promise<AuthUser>;
  signInAsClient: (email: string, passcode: string) => Promise<AuthUser>;
  startPreviewAs: (
    company: CompanyProfile,
    persona: CompanyPersona,
    allowedProductIds: string[]
  ) => Promise<void>;
  exitPreview: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = "kpmg_cfo_advisory_session_v1";
const SESSION_CHANGE_EVENT = "kpmg-cfo-session-change";

const AuthContext = createContext<AuthContextValue | null>(null);

async function safeParseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.name !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined = undefined;
let cachedUser: AuthUser | null = null;

function getClientSnapshot(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw === cachedRaw) {
      return cachedUser;
    }
    cachedRaw = raw;
    cachedUser = readStoredUser();
    return cachedUser;
  } catch {
    return null;
  }
}

function getServerSnapshot(): AuthUser | null {
  return null;
}

function subscribeSession(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(SESSION_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SESSION_CHANGE_EVENT, handler);
  };
}

function persistSession(nextUser: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (nextUser) {
      const serialized = JSON.stringify(nextUser);
      if (serialized === cachedRaw) return;
      window.sessionStorage.setItem(SESSION_KEY, serialized);
      cachedRaw = serialized;
      cachedUser = nextUser;
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
      cachedRaw = null;
      cachedUser = null;
    }
  } catch {
    // Ignore storage quota errors in restricted browser modes
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(
    subscribeSession,
    getClientSnapshot,
    getServerSnapshot
  );

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isServerSynced, setIsServerSynced] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const isPreviewMode = Boolean(user && user.method === "kpmg_preview");

  // Hydrate and verify authoritative session from server-signed HttpOnly cookie
  useEffect(() => {
    let cancelled = false;
    const syncFromServer = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        const data = await safeParseJson(res);
        if (res.ok && data.active === true && data.user) {
          persistSession(data.user as AuthUser);
        } else {
          if (
            (res.status === 403 || res.status === 404) &&
            typeof data.reason === "string"
          ) {
            setSessionNotice(data.reason);
          }
          persistSession(null);
        }
      } catch {
        // Keep current cached state on transient network hiccup
      } finally {
        if (!cancelled) setIsServerSynced(true);
      }
    };
    void syncFromServer();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const signInWithCredentials = useCallback(
    async (email: string, passcode: string): Promise<AuthUser> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPasscode = passcode.trim();

      if (!cleanEmail || !cleanPasscode) {
        throw new Error("Please enter your KPMG advisory email and passcode.");
      }

      setIsAuthenticating(true);
      try {
        const res = await fetch("/api/auth/kpmg-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: cleanEmail, passcode: cleanPasscode }),
        });

        const data = await safeParseJson(res);
        if (!res.ok || !data.user) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Invalid advisory credentials. Please verify your email and passcode."
          );
        }

        const credUser = data.user as AuthUser;
        setSessionNotice(null);
        persistSession(credUser);
        setIsLoginOpen(false);
        return credUser;
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  const signInAsClient = useCallback(
    async (email: string, passcode: string): Promise<AuthUser> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPasscode = passcode.trim();

      if (!cleanEmail || !cleanPasscode) {
        throw new Error("Please enter your client persona email and passcode.");
      }

      setIsAuthenticating(true);
      try {
        const res = await fetch("/api/auth/client-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: cleanEmail, passcode: cleanPasscode }),
        });

        const data = await safeParseJson(res);
        if (!res.ok || !data.user) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Authentication failed. Please check your credentials."
          );
        }

        const clientUser = data.user as AuthUser;
        setSessionNotice(null);
        persistSession(clientUser);
        setIsLoginOpen(false);
        return clientUser;
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  // Live session sync for authenticated client personas so revocations, suspensions,
  // and entitlement/permission toggles take effect immediately via verified cookie.
  const isClientSession = user?.method === "client_credentials";

  useEffect(() => {
    if (!isClientSession) return;
    let cancelled = false;

    const revalidate = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
          cache: "no-store",
        });
        if (cancelled) return;
        const data = await safeParseJson(res);

        if (
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404 ||
          data.active === false
        ) {
          setSessionNotice(
            typeof data.reason === "string"
              ? data.reason
              : "Your access has been revoked or suspended by KPMG Advisory."
          );
          persistSession(null);
          return;
        }

        if (res.ok && data.active === true && data.user) {
          persistSession(data.user as AuthUser);
        }
      } catch {
        // Ignore transient network hiccups during background sync
      }
    };

    const interval = setInterval(() => void revalidate(), 5000);
    const onFocus = () => void revalidate();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isClientSession]);

  const startPreviewAs = useCallback(
    async (
      company: CompanyProfile,
      persona: CompanyPersona,
      _allowedProductIds: string[]
    ) => {
      void _allowedProductIds;
      if (!user || (user.tenantType !== "kpmg" && user.method !== "kpmg_preview")) {
        return;
      }
      const res = await fetch("/api/auth/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "start",
          companyId: company.id,
          personaId: persona.id,
        }),
      });
      const data = await safeParseJson(res);
      if (res.ok && data.user) {
        persistSession(data.user as AuthUser);
      }
    },
    [user]
  );

  const exitPreview = useCallback(async () => {
    if (!user || user.method !== "kpmg_preview") return;
    const res = await fetch("/api/auth/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "exit" }),
    });
    const data = await safeParseJson(res);
    if (res.ok && data.user) {
      persistSession(data.user as AuthUser);
    } else if (user.previewOriginalAdmin) {
      persistSession(user.previewOriginalAdmin);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Clear local session regardless
    }
    persistSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: !isHydrated || !isServerSynced || isAuthenticating,
      isLoginOpen,
      isPreviewMode,
      sessionNotice,
      clearSessionNotice,
      openLogin,
      closeLogin,
      signInWithCredentials,
      signInAsClient,
      startPreviewAs,
      exitPreview,
      signOut,
    }),
    [
      user,
      isHydrated,
      isServerSynced,
      isAuthenticating,
      isLoginOpen,
      isPreviewMode,
      sessionNotice,
      clearSessionNotice,
      openLogin,
      closeLogin,
      signInWithCredentials,
      signInAsClient,
      startPreviewAs,
      exitPreview,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
