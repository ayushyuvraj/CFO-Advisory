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
import { KPMG_LEAD_USER } from "@/config/authConfig";
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
  ) => void;
  exitPreview: () => void;
  signOut: () => void;
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

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const isPreviewMode = Boolean(user && user.method === "kpmg_preview");

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
        if (
          cleanEmail !== KPMG_LEAD_USER.email.toLowerCase() ||
          cleanPasscode !== KPMG_LEAD_USER.passcode
        ) {
          throw new Error(
            "Invalid advisory credentials. Please verify your email and passcode."
          );
        }

        const credUser: AuthUser = {
          id: "usr-kpmg-lead",
          name: KPMG_LEAD_USER.name,
          role: KPMG_LEAD_USER.role,
          email: KPMG_LEAD_USER.email,
          method: "credentials",
          badge: KPMG_LEAD_USER.badge,
          tenantType: "kpmg",
        };
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
          body: JSON.stringify({ email: cleanEmail, passcode: cleanPasscode }),
        });

        const data = await safeParseJson(res);
        if (!res.ok) {
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
  // and entitlement/permission toggles take effect immediately without requiring sign-out.
  const clientCompanyId =
    user?.method === "client_credentials" ? user.companyId : undefined;
  const clientPersonaId =
    user?.method === "client_credentials" ? user.personaId : undefined;

  useEffect(() => {
    if (!clientCompanyId || !clientPersonaId) return;
    let cancelled = false;

    const revalidate = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: clientCompanyId,
            personaId: clientPersonaId,
          }),
          cache: "no-store",
        });
        if (cancelled) return;
        const data = await safeParseJson(res);

        if (res.status === 403 || res.status === 404 || data.active === false) {
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

    void revalidate();
    const interval = setInterval(() => void revalidate(), 5000);
    const onFocus = () => void revalidate();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [clientCompanyId, clientPersonaId]);

  const startPreviewAs = useCallback(
    (
      company: CompanyProfile,
      persona: CompanyPersona,
      allowedProductIds: string[]
    ) => {
      if (!user) return;
      const originalAdmin =
        user.method === "kpmg_preview"
          ? user.previewOriginalAdmin || user
          : user;

      const effectiveAllowed =
        company.status === "active" ? allowedProductIds : [];

      const previewUser: AuthUser = {
        id: persona.id,
        name: persona.name,
        role: persona.roleTitle,
        email: persona.email,
        method: "kpmg_preview",
        badge:
          company.status === "active"
            ? `Preview: ${company.name}`
            : `Preview (Suspended): ${company.name}`,
        tenantType: "client",
        companyId: company.id,
        companyName: company.name,
        personaId: persona.id,
        permissions: persona.permissions,
        allowedProductIds: effectiveAllowed,
        previewOriginalAdmin: originalAdmin,
      };

      persistSession(previewUser);
    },
    [user]
  );

  const exitPreview = useCallback(() => {
    if (!user || !user.previewOriginalAdmin) return;
    persistSession(user.previewOriginalAdmin);
  }, [user]);

  const signOut = useCallback(() => {
    persistSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: !isHydrated || isAuthenticating,
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
