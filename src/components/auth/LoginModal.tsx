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
            className="fixed inset-0 bg-[#030816]/80 backdrop-blur-sm"
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
            className="relative z-10 w-full max-w-md rounded-sm border border-[#162447] bg-[#0B1736] p-6 shadow-2xl shadow-black/50 focus:outline-none sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="login-modal-title"
                  className="text-xl font-semibold tracking-tight text-[#F4F7FB]"
                >
                  Sign in to Workflows
                </h2>
                <p className="mt-1 text-sm text-[#CBD5E1]">
                  Access synchronized CFO Advisory workflows from Workflow Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogin}
                aria-label="Close sign in dialog"
                className="rounded-sm border border-[#162447] bg-[#07112B] p-1.5 text-[#CBD5E1] transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-[#F4F7FB] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
              >
                <X size={18} weight="light" />
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Authentication methods"
              className="mt-6 grid grid-cols-3 gap-1.5 rounded-sm border border-[#162447] bg-[#07112B] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sso"}
                onClick={() => handleTabSwitch("sso")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                  activeTab === "sso"
                    ? "bg-[#1E6BFF] text-white"
                    : "text-[#CBD5E1] hover:text-[#F4F7FB]"
                }`}
              >
                KPMG SSO
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "credentials"}
                onClick={() => handleTabSwitch("credentials")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                  activeTab === "credentials"
                    ? "bg-[#1E6BFF] text-white"
                    : "text-[#CBD5E1] hover:text-[#F4F7FB]"
                }`}
              >
                Work Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "token"}
                onClick={() => handleTabSwitch("token")}
                className={`rounded-sm px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                  activeTab === "token"
                    ? "bg-[#1E6BFF] text-white"
                    : "text-[#CBD5E1] hover:text-[#F4F7FB]"
                }`}
              >
                Client Token
              </button>
            </div>

            {activeTab === "sso" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-sm border border-[#162447] bg-[#07112B] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={20}
                      weight="light"
                      className="mt-0.5 shrink-0 text-[#1E6BFF]"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#F4F7FB]">
                        KPMG Enterprise Entra ID
                      </p>
                      <p className="text-xs leading-relaxed text-[#CBD5E1]">
                        Single sign-on for advisory leadership and engagement architects. Demo session authenticates as Elena Vance, Managing Director.
                      </p>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#FCA5A5]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSSO}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#1E6BFF] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1736]"
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
                    className="text-xs font-medium text-[#F4F7FB]"
                  >
                    Advisory work email
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
                      size={16}
                      weight="light"
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#7E91B3]"
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
                      className="w-full rounded-sm border border-[#162447] bg-[#07112B] py-2.5 pr-3 pl-9 text-sm text-[#F4F7FB] placeholder:text-[#7E91B3] transition-colors duration-150 focus:border-[#1E6BFF] focus:outline-none focus:ring-1 focus:ring-[#1E6BFF]"
                    />
                  </div>
                  <p id="advisory-email-hint" className="text-xs text-[#7E91B3]">
                    Use your corporate finance or advisory domain email.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="advisory-passcode"
                    className="text-xs font-medium text-[#F4F7FB]"
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
                    className="w-full rounded-sm border border-[#162447] bg-[#07112B] px-3 py-2.5 text-sm text-[#F4F7FB] placeholder:text-[#7E91B3] transition-colors duration-150 focus:border-[#1E6BFF] focus:outline-none focus:ring-1 focus:ring-[#1E6BFF]"
                  />
                  <p id="advisory-passcode-hint" className="text-xs text-[#7E91B3]">
                    Protected under engagement governance policy.
                  </p>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#FCA5A5]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#1E6BFF] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1736]"
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
                      className="text-xs font-medium text-[#F4F7FB]"
                    >
                      Client engagement token
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setToken("KPMG-CFO-2026");
                        setErrorMessage(null);
                      }}
                      className="text-xs font-mono text-[#7FB0FF] underline underline-offset-4 transition-colors duration-150 hover:text-[#F4F7FB] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1E6BFF]"
                    >
                      Fill KPMG-CFO-2026
                    </button>
                  </div>
                  <div className="relative">
                    <Key
                      size={16}
                      weight="light"
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#7E91B3]"
                    />
                    <input
                      id="engagement-token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="KPMG-CFO-2026"
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={tokenDescribedBy}
                      className="w-full rounded-sm border border-[#162447] bg-[#07112B] py-2.5 pr-3 pl-9 font-mono text-sm uppercase text-[#F4F7FB] placeholder:text-[#7E91B3] transition-colors duration-150 focus:border-[#1E6BFF] focus:outline-none focus:ring-1 focus:ring-[#1E6BFF]"
                    />
                  </div>
                  <p id="engagement-token-hint" className="text-xs text-[#7E91B3]">
                    Issued by your KPMG engagement partner for boardroom read access. Sample token: KPMG-CFO-2026.
                  </p>
                </div>

                {errorMessage && (
                  <p
                    id="login-error-alert"
                    role="alert"
                    className="text-xs font-medium text-[#FCA5A5]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#1E6BFF] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1736]"
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
