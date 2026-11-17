"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Buildings,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  User,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

function LoginModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const { signInWithCredentials, signInAsClient } = useAuth();

  const [authTab, setAuthTab] = useState<"kpmg" | "client">("kpmg");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSafeClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [submitting, onClose]);

  useDialogFocusTrap(true, panelRef, handleSafeClose);

  const redirectToWorkflows = () => {
    if (pathname !== "/workflows") {
      router.push("/workflows");
    }
  };

  const handleTabChange = (tab: "kpmg" | "client") => {
    setAuthTab(tab);
    setErrorMessage(null);
    setEmail("");
    setPasscode("");
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (authTab === "kpmg") {
        await signInWithCredentials(email, passcode);
      } else {
        await signInAsClient(email, passcode);
      }
      redirectToWorkflows();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const emailDescribedBy = errorMessage
    ? "auth-email-hint login-error-alert"
    : "auth-email-hint";
  const passcodeDescribedBy = errorMessage
    ? "auth-passcode-hint login-error-alert"
    : "auth-passcode-hint";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onClick={handleSafeClose}
        className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={
          prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }
        }
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={
          prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97, y: 6 }
        }
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onWheel={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain rounded-sm border border-[#D8DFE9] bg-white p-6 text-[#0C233C] shadow-2xl shadow-[#0C233C]/20 focus:outline-none sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-sm border border-[#00338D]/20 bg-[#00338D]/5 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#00338D]">
              <ShieldCheck size={14} weight="bold" />
              <span>
                {authTab === "kpmg"
                  ? "KPMG ADVISORY ACCESS"
                  : "CLIENT ENTERPRISE ACCESS"}
              </span>
            </div>
            <h2
              id="login-modal-title"
              className="mt-2 text-xl font-semibold tracking-tight text-[#0C233C]"
            >
              Sign in to Workflows
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              {authTab === "kpmg"
                ? "Enter designated KPMG Lead credentials to access Connected Platforms."
                : "Enter your client persona email and passcode to access your assigned systems."}
            </p>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            disabled={submitting}
            onClick={handleSafeClose}
            aria-label="Close sign in dialog"
            className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1.5 text-[#333940] transition-[border-color,color,transform] duration-150 hover:border-[#00338D] hover:text-[#00338D] active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
          >
            <X size={18} weight="light" />
          </button>
        </div>

        {/* Segmented Sign-in Mode Switcher */}
        <div
          role="tablist"
          aria-label="Sign in mode"
          className="mt-5 grid grid-cols-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={authTab === "kpmg"}
            onClick={() => handleTabChange("kpmg")}
            className={`flex items-center justify-center gap-1.5 rounded-xs py-1.5 font-semibold transition-all ${
              authTab === "kpmg"
                ? "bg-[#00338D] text-white shadow-xs"
                : "text-[#4B5563] hover:text-[#0C233C]"
            }`}
          >
            <ShieldCheck size={15} weight="bold" />
            <span>KPMG Lead</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={authTab === "client"}
            onClick={() => handleTabChange("client")}
            className={`flex items-center justify-center gap-1.5 rounded-xs py-1.5 font-semibold transition-all ${
              authTab === "client"
                ? "bg-[#00338D] text-white shadow-xs"
                : "text-[#4B5563] hover:text-[#0C233C]"
            }`}
          >
            <Buildings size={15} weight="bold" />
            <span>Client Persona</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-email"
              className="text-xs font-medium text-[#0C233C]"
            >
              {authTab === "kpmg"
                ? "Advisory corporate email"
                : "Client persona email"}
            </label>
            <div className="relative">
              {authTab === "kpmg" ? (
                <EnvelopeSimple
                  size={16}
                  weight="light"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                />
              ) : (
                <User
                  size={16}
                  weight="light"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                />
              )}
              <input
                id="auth-email"
                data-autofocus="true"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={
                  authTab === "kpmg"
                    ? "kpmg.lead@kpmg.com"
                    : "name@clientcompany.com"
                }
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={emailDescribedBy}
                className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2.5 pr-3 pl-9 text-sm text-[#0C233C] placeholder:text-[#6B7280] transition-colors duration-150 focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
              />
            </div>
            <p id="auth-email-hint" className="text-[11px] text-[#4B5563]">
              {authTab === "kpmg"
                ? "Designated address for KPMG Advisory Leadership."
                : "Registered persona address assigned by KPMG Lead."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-passcode"
              className="text-xs font-medium text-[#0C233C]"
            >
              Passcode
            </label>
            <div className="relative">
              <LockKey
                size={16}
                weight="light"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
              />
              <input
                id="auth-passcode"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter session passcode"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={passcodeDescribedBy}
                className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2.5 pr-10 pl-9 text-sm text-[#0C233C] placeholder:text-[#6B7280] transition-colors duration-150 focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[#6B7280] transition-colors hover:text-[#0C233C]"
              >
                {showPassword ? (
                  <EyeSlash size={16} weight="light" />
                ) : (
                  <Eye size={16} weight="light" />
                )}
              </button>
            </div>
            <p id="auth-passcode-hint" className="text-[11px] text-[#4B5563]">
              {authTab === "kpmg"
                ? "Protected engagement authentication token."
                : "Client session credential configured in governance."}
            </p>
          </div>

          {errorMessage && (
            <div
              id="login-error-alert"
              role="alert"
              className="rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 p-3 text-xs font-medium text-[#B91C1C]"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <span>
              {submitting
                ? "Verifying Credentials..."
                : authTab === "kpmg"
                ? "Sign In to Advisory Workflows"
                : "Sign In as Client Persona"}
            </span>
            <ArrowRight size={16} weight="light" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function LoginModal() {
  const { isLoginOpen, closeLogin } = useAuth();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isLoginOpen && <LoginModalContent onClose={closeLogin} />}
    </AnimatePresence>,
    document.body
  );
}
