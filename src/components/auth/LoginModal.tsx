"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  EnvelopeSimple,
  Key,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

type LoginTab = "sso" | "credentials" | "token";

export function LoginModal() {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    isLoginOpen,
    closeLogin,
    signInWithSSO,
    signInWithCredentials,
    signInWithToken,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<LoginTab>("sso");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useDialogFocusTrap(isLoginOpen, panelRef, closeLogin);

  const redirectToWorkflows = () => {
    if (pathname !== "/workflows") {
      router.push("/workflows");
    }
  };

  const handleTabSwitch = (tab: LoginTab) => {
    setActiveTab(tab);
    setErrorMessage(null);
  };

  const handleSSO = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signInWithSSO();
      redirectToWorkflows();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to complete Entra ID SSO."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signInWithCredentials(email, passcode);
      redirectToWorkflows();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Invalid advisory credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTokenSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signInWithToken(token);
      redirectToWorkflows();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Invalid engagement token."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const emailDescribedBy = errorMessage
    ? "advisory-email-hint login-error-alert"
    : "advisory-email-hint";
  const passcodeDescribedBy = errorMessage
    ? "advisory-passcode-hint login-error-alert"
    : "advisory-passcode-hint";
  const tokenDescribedBy = errorMessage
    ? "engagement-token-hint login-error-alert"
    : "engagement-token-hint";

  return (
    <AnimatePresence>
      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={closeLogin}
            className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? undefined
                : { opacity: 0, scale: 0.97, y: 6 }
            }
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-sm border border-[#D8DFE9] bg-white p-6 text-[#0C233C] shadow-2xl shadow-[#0C233C]/20 focus:outline-none sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="login-modal-title"
                  className="text-xl font-semibold tracking-tight text-[#0C233C]"
                >
                  Sign in to Workflows
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Access synchronized CFO Advisory workflows from Workflow Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogin}
                aria-label="Close sign in dialog"
                className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1.5 text-[#333940] transition-[border-color,color,transform] duration-150 hover:border-[#00338D] hover:text-[#00338D] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
              >
                <X size={18} weight="light" />
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Authentication methods"
              className="mt-6 grid grid-cols-3 gap-1.5 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sso"}
                onClick={() => handleTabSwitch("sso")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                  activeTab === "sso"
                    ? "bg-[#00338D] text-white"
                    : "text-[#333940] hover:text-[#00338D]"
                }`}
              >
                KPMG SSO
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "credentials"}
                onClick={() => handleTabSwitch("credentials")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                  activeTab === "credentials"
                    ? "bg-[#00338D] text-white"
                    : "text-[#333940] hover:text-[#00338D]"
                }`}
              >
                Work Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "token"}
                onClick={() => handleTabSwitch("token")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                  activeTab === "token"
                    ? "bg-[#00338D] text-white"
                    : "text-[#333940] hover:text-[#00338D]"
                }`}
              >
                Client Token
              </button>
            </div>

            {activeTab === "sso" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={20}
                      weight="light"
                      className="mt-0.5 shrink-0 text-[#00338D]"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#0C233C]">
                        KPMG Enterprise Entra ID
                      </p>
                      <p className="text-xs leading-relaxed text-[#4B5563]">
                        Single sign-on for advisory leadership and engagement architects. Demo session authenticates as Elena Vance, Managing Director.
                      </p>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#B91C1C]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSSO}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>
                    {submitting
                      ? "Verifying Entra ID session..."
                      : "Continue with KPMG Entra ID"}
                  </span>
                  <ArrowRight size={16} weight="light" />
                </button>
              </div>
            )}

            {activeTab === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4" noValidate>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="advisory-email"
                    className="text-xs font-medium text-[#0C233C]"
                  >
                    Advisory work email
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
                      size={16}
                      weight="light"
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                    />
                    <input
                      id="advisory-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@enterprise.com"
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={emailDescribedBy}
                      className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2.5 pr-3 pl-9 text-sm text-[#0C233C] placeholder:text-[#6B7280] transition-colors duration-150 focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                    />
                  </div>
                  <p id="advisory-email-hint" className="text-xs text-[#4B5563]">
                    Use your corporate finance or advisory domain email.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="advisory-passcode"
                    className="text-xs font-medium text-[#0C233C]"
                  >
                    Session passcode
                  </label>
                  <input
                    id="advisory-passcode"
                    type="password"
                    autoComplete="current-password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Minimum 6 characters"
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={passcodeDescribedBy}
                    className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0C233C] placeholder:text-[#6B7280] transition-colors duration-150 focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                  />
                  <p id="advisory-passcode-hint" className="text-xs text-[#4B5563]">
                    Protected under engagement governance policy.
                  </p>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#B91C1C]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>
                    {submitting ? "Authenticating..." : "Authenticate Session"}
                  </span>
                  <ArrowRight size={16} weight="light" />
                </button>
              </form>
            )}

            {activeTab === "token" && (
              <form onSubmit={handleTokenSubmit} className="mt-6 space-y-4" noValidate>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="engagement-token"
                      className="text-xs font-medium text-[#0C233C]"
                    >
                      Client engagement token
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setToken("KPMG-CFO-2026");
                        setErrorMessage(null);
                      }}
                      className="text-xs font-mono text-[#1E49E2] underline underline-offset-4 transition-colors duration-150 hover:text-[#00338D] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1E49E2]"
                    >
                      Fill KPMG-CFO-2026
                    </button>
                  </div>
                  <div className="relative">
                    <Key
                      size={16}
                      weight="light"
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                    />
                    <input
                      id="engagement-token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="KPMG-CFO-2026"
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={tokenDescribedBy}
                      className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2.5 pr-3 pl-9 font-mono text-sm uppercase text-[#0C233C] placeholder:text-[#6B7280] transition-colors duration-150 focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                    />
                  </div>
                  <p id="engagement-token-hint" className="text-xs text-[#4B5563]">
                    Issued by your KPMG engagement partner for boardroom read access. Sample token: KPMG-CFO-2026.
                  </p>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#B91C1C]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>
                    {submitting ? "Validating token..." : "Verify Engagement Token"}
                  </span>
                  <ArrowRight size={16} weight="light" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
