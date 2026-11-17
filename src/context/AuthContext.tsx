"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { KPMG_LEAD_USER } from "@/config/authConfig";

export type AuthMethod = "sso" | "credentials" | "token";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  email: string;
  method: AuthMethod;
  badge: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  signInWithSSO: () => Promise<AuthUser>;
  signInWithCredentials: (email: string, passcode: string) => Promise<AuthUser>;
  signInWithToken: (token: string) => Promise<AuthUser>;
  signOut: () => void;
}

const SESSION_KEY = "kpmg_cfo_advisory_session_v1";
const SESSION_CHANGE_EVENT = "kpmg-cfo-session-change";

const AuthContext = createContext<AuthContextValue | null>(null);

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Advisor";
  const parts = local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "Advisory Principal";
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const signInWithSSO = useCallback(async (): Promise<AuthUser> => {
    setIsAuthenticating(true);
    await new Promise((resolve) => setTimeout(resolve, 520));
    const ssoUser: AuthUser = {
      id: "usr-elena-vance",
      name: "Elena Vance",
      role: "Managing Director, CFO Advisory",
      email: "elena.vance@kpmg-advisory.com",
      method: "sso",
      badge: "Entra ID SSO",
    };
    persistSession(ssoUser);
    setIsAuthenticating(false);
    setIsLoginOpen(false);
    return ssoUser;
  }, []);

  const signInWithCredentials = useCallback(
    async (email: string, passcode: string): Promise<AuthUser> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPasscode = passcode.trim();

      if (!cleanEmail || !cleanPasscode) {
        throw new Error("Please enter your KPMG advisory email and passcode.");
      }

      setIsAuthenticating(true);
      await new Promise((resolve) => setTimeout(resolve, 380));

      if (
        cleanEmail !== KPMG_LEAD_USER.email.toLowerCase() ||
        cleanPasscode !== KPMG_LEAD_USER.passcode
      ) {
        setIsAuthenticating(false);
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
      };
      persistSession(credUser);
      setIsAuthenticating(false);
      setIsLoginOpen(false);
      return credUser;
    },
    []
  );

  const signInWithToken = useCallback(
    async (token: string): Promise<AuthUser> => {
      const cleanToken = token.trim().toUpperCase();
      if (!/^[A-Z0-9-]{8,}$/.test(cleanToken)) {
        throw new Error(
          "Enter a valid engagement token such as KPMG-CFO-2026."
        );
      }

      setIsAuthenticating(true);
      await new Promise((resolve) => setTimeout(resolve, 420));

      const tokenUser: AuthUser = {
        id: `usr-token-${cleanToken}`,
        name: "Enterprise CFO Guest",
        role: `Engagement ${cleanToken}`,
        email: "cfo.guest@enterprise-client.com",
        method: "token",
        badge: "Engagement Token",
      };
      persistSession(tokenUser);
      setIsAuthenticating(false);
      setIsLoginOpen(false);
      return tokenUser;
    },
    []
  );

  const signOut = useCallback(() => {
    persistSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: !isHydrated || isAuthenticating,
      isLoginOpen,
      openLogin,
      closeLogin,
      signInWithSSO,
      signInWithCredentials,
      signInWithToken,
      signOut,
    }),
    [
      user,
      isHydrated,
      isAuthenticating,
      isLoginOpen,
      openLogin,
      closeLogin,
      signInWithSSO,
      signInWithCredentials,
      signInWithToken,
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
