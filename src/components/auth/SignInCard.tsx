"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Buildings,
  Check,
  CircleNotch,
  Eye,
  EyeSlash,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { KpmgLogo } from "@/components/brand/KpmgLogo";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignInCardProps {
  variant: "modal" | "page";
  onClose?: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
  sessionNotice?: string | null;
  onDismissNotice?: () => void;
}

export function SignInCard({
  variant,
  onClose,
  onSubmittingChange,
  sessionNotice,
  onDismissNotice,
}: SignInCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { signInWithCredentials, signInAsClient } = useAuth();

  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passcodeInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFocusRef = useRef<"email" | "passcode" | null>(null);

  const [authTab, setAuthTab] = useState<"kpmg" | "client">("kpmg");
  const [step, setStep] = useState<"email" | "passcode">("email");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  // Measure active step container for smooth pixel-height morphing
  useEffect(() => {
    const el = measureRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextHeight = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        if (nextHeight > 0) {
          setMeasuredHeight((prev) => (prev === nextHeight ? prev : nextHeight));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bindEmailInput = useCallback((node: HTMLInputElement | null) => {
    emailInputRef.current = node;
    if (node && pendingFocusRef.current === "email") {
      pendingFocusRef.current = null;
      window.requestAnimationFrame(() => {
        node.focus();
      });
    }
  }, []);

  const bindPasscodeInput = useCallback((node: HTMLInputElement | null) => {
    passcodeInputRef.current = node;
    if (node && pendingFocusRef.current === "passcode") {
      pendingFocusRef.current = null;
      window.requestAnimationFrame(() => {
        node.focus();
      });
    }
  }, []);

  const triggerErrorShake = useCallback(() => {
    if (prefersReducedMotion || !cardRef.current?.animate) return;
    cardRef.current.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0px)" },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      }
    );
  }, [prefersReducedMotion]);

  const handleTabChange = (tab: "kpmg" | "client") => {
    if (tab === authTab || submitting || verified) return;
    setAuthTab(tab);
    setErrorMessage(null);
    setPasscode("");
    setShowPassword(false);
  };

  const handleContinueEmail = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage(
        authTab === "kpmg"
          ? "Enter your KPMG advisory email to continue."
          : "Enter your client persona email to continue."
      );
      triggerErrorShake();
      emailInputRef.current?.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setErrorMessage("Enter a valid email address.");
      triggerErrorShake();
      emailInputRef.current?.focus();
      return;
    }

    setEmail(trimmed);
    setErrorMessage(null);
    setDirection(1);
    pendingFocusRef.current = "passcode";
    setStep("passcode");
  };

  const handleBackToEmail = () => {
    if (submitting || verified) return;
    setErrorMessage(null);
    setPasscode("");
    setShowPassword(false);
    setDirection(-1);
    pendingFocusRef.current = "email";
    setStep("email");
  };

  const handleSubmitPasscode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || verified) return;

    const trimmedPasscode = passcode.trim();
    if (!trimmedPasscode) {
      setErrorMessage("Enter your passcode to sign in.");
      triggerErrorShake();
      passcodeInputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    onSubmittingChange?.(true);

    const signInOptions = {
      onVerified: () => setVerified(true),
      commitDelayMs: prefersReducedMotion ? 0 : 240,
    };

    try {
      if (authTab === "kpmg") {
        await signInWithCredentials(email, trimmedPasscode, signInOptions);
      } else {
        await signInAsClient(email, trimmedPasscode, signInOptions);
      }
      if (pathname !== "/workflows") {
        router.push("/workflows");
      }
    } catch (err) {
      setVerified(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify your credentials."
      );
      triggerErrorShake();
      passcodeInputRef.current?.focus();
    } finally {
      setSubmitting(false);
      onSubmittingChange?.(false);
    }
  };

  const isBusy = submitting || verified;
  const HeadingTag = variant === "modal" ? "h2" : "h1";
  const stepOffset = direction * 14;

  const stepInitial = prefersReducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        transform: `translateX(${stepOffset}px)`,
        filter: "blur(2px)",
      };

  const stepAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        transform: "translateX(0px)",
        filter: "blur(0px)",
      };

  const stepExit = prefersReducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        transform: `translateX(${-stepOffset}px)`,
        filter: "blur(2px)",
      };

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-[400px] rounded-sm border border-[#D8DFE9] bg-white p-7 text-[#0C233C] shadow-[0_24px_60px_-16px_rgba(12,35,60,0.16)] sm:p-8"
    >
      {variant === "modal" && onClose && (
        <button
          type="button"
          data-dialog-close="true"
          disabled={isBusy}
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-sm text-[#526075] transition-[background-color,color,transform] duration-150 hover:bg-[#F4F6FA] hover:text-[#0C233C] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
        >
          <X size={17} weight="light" />
        </button>
      )}

      {/* Centered Editorial Brand Header */}
      <div className="flex flex-col items-center text-center">
        <KpmgLogo className="h-[24px] w-auto shrink-0" />

        <div className="relative mt-5 h-7 w-full overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateY(6px)" }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, transform: "translateY(0px)" }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateY(-6px)" }
              }
              transition={{ duration: 0.16, ease: EASE_OUT }}
            >
              <HeadingTag
                id="login-modal-title"
                className="text-[21px] font-semibold tracking-[-0.02em] text-[#0C233C] leading-7"
              >
                {step === "email" ? "Sign in to Workflows" : "Enter your passcode"}
              </HeadingTag>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-1 text-[13px] text-[#526075]">
          Managed Services Finance &amp; Accounting
        </p>
      </div>

      {/* Session revocation / expiry notice on inline page */}
      <AnimatePresence initial={false}>
        {sessionNotice && (
          <motion.div
            key="session-notice"
            role="alert"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="mt-5 flex items-start justify-between gap-2.5 rounded-sm border border-[#B91C1C]/25 bg-[#B91C1C]/5 p-3 text-xs text-[#991B1B]"
          >
            <div className="flex items-start gap-2">
              <WarningCircle size={15} weight="regular" className="mt-0.5 shrink-0" />
              <span>{sessionNotice}</span>
            </div>
            {onDismissNotice && (
              <button
                type="button"
                onClick={onDismissNotice}
                className="shrink-0 font-medium underline underline-offset-2 hover:text-[#7F1D1D]"
              >
                Dismiss
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Height-Morphing Step Viewport */}
      <div
        className="mt-6 overflow-hidden transition-[height] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          height: measuredHeight !== null ? `${measuredHeight}px` : undefined,
        }}
      >
        <div ref={measureRef} className="px-1 py-1">
          <AnimatePresence mode="wait" initial={false}>
            {step === "email" ? (
              <motion.form
                key="step-email"
                onSubmit={handleContinueEmail}
                noValidate
                initial={stepInitial}
                animate={stepAnimate}
                exit={stepExit}
                transition={{ duration: 0.19, ease: EASE_OUT }}
                className="space-y-4"
              >
                {/* Quiet GPU-Sliding Mode Switcher */}
                <div
                  role="tablist"
                  aria-label="Sign in mode"
                  className="relative grid grid-cols-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[2px] bg-white shadow-[0_1px_2px_rgba(12,35,60,0.08)] ring-1 ring-[#D8DFE9]/80 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{
                      transform:
                        authTab === "kpmg"
                          ? "translateX(0%)"
                          : "translateX(100%)",
                    }}
                  />
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === "kpmg"}
                    onClick={() => handleTabChange("kpmg")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                      authTab === "kpmg"
                        ? "text-[#0C233C]"
                        : "text-[#526075] hover:text-[#0C233C]"
                    }`}
                  >
                    <ShieldCheck size={14} weight="regular" />
                    <span>KPMG Lead</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === "client"}
                    onClick={() => handleTabChange("client")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                      authTab === "client"
                        ? "text-[#0C233C]"
                        : "text-[#526075] hover:text-[#0C233C]"
                    }`}
                  >
                    <Buildings size={14} weight="regular" />
                    <span>Client Persona</span>
                  </button>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[#333940]"
                  >
                    {authTab === "kpmg" ? "Work email" : "Client email"}
                  </label>
                  <input
                    ref={bindEmailInput}
                    id="auth-email"
                    name="email"
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
                    aria-describedby={
                      errorMessage ? "login-error-alert" : undefined
                    }
                    className="h-11 w-full rounded-sm border border-[#D8DFE9] bg-white px-3.5 text-sm text-[#0C233C] placeholder:text-[#8692A6] transition-[border-color,box-shadow] duration-150 hover:border-[#B8C4D4] focus:border-[#1E49E2] focus:outline-none focus:ring-2 focus:ring-[#1E49E2]/15"
                  />
                </div>

                {/* Inline Validation Alert */}
                <AnimatePresence initial={false}>
                  {errorMessage && (
                    <motion.div
                      id="login-error-alert"
                      role="alert"
                      aria-live="polite"
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, transform: "translateY(-4px)" }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, transform: "translateY(0px)" }
                      }
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                      className="rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2.5 text-xs font-medium text-[#B91C1C]"
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} weight="regular" />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step-passcode"
                onSubmit={handleSubmitPasscode}
                noValidate
                initial={stepInitial}
                animate={stepAnimate}
                exit={stepExit}
                transition={{ duration: 0.19, ease: EASE_OUT }}
                className="space-y-4"
              >
                {/* Hidden username field for password manager autofill */}
                <input
                  type="email"
                  name="email"
                  value={email}
                  readOnly
                  autoComplete="username"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />

                {/* Editable Email Identity Chip */}
                <div className="flex items-center justify-between gap-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-3 py-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    {authTab === "kpmg" ? (
                      <ShieldCheck
                        size={14}
                        weight="regular"
                        className="shrink-0 text-[#00338D]"
                      />
                    ) : (
                      <Buildings
                        size={14}
                        weight="regular"
                        className="shrink-0 text-[#00338D]"
                      />
                    )}
                    <span className="truncate font-medium text-[#0C233C]">
                      {email}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleBackToEmail}
                    className="shrink-0 font-medium text-[#1E49E2] transition-colors duration-150 hover:text-[#00338D] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:underline"
                  >
                    Change
                  </button>
                </div>

                {/* Passcode Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-passcode"
                    className="block text-xs font-medium text-[#333940]"
                  >
                    Passcode
                  </label>
                  <div className="relative">
                    <input
                      ref={bindPasscodeInput}
                      id="auth-passcode"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={passcode}
                      disabled={isBusy}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter passcode"
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={
                        errorMessage ? "login-error-alert" : undefined
                      }
                      className="h-11 w-full rounded-sm border border-[#D8DFE9] bg-white pr-10 pl-3.5 text-sm text-[#0C233C] placeholder:text-[#8692A6] transition-[border-color,box-shadow] duration-150 hover:border-[#B8C4D4] focus:border-[#1E49E2] focus:outline-none focus:ring-2 focus:ring-[#1E49E2]/15 disabled:bg-[#F4F6FA] disabled:text-[#526075]"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-1 text-[#526075] transition-colors duration-150 hover:text-[#0C233C] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
                    >
                      {showPassword ? (
                        <EyeSlash size={16} weight="light" />
                      ) : (
                        <Eye size={16} weight="light" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline Auth Error Alert */}
                <AnimatePresence initial={false}>
                  {errorMessage && (
                    <motion.div
                      id="login-error-alert"
                      role="alert"
                      aria-live="polite"
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, transform: "translateY(-4px)" }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, transform: "translateY(0px)" }
                      }
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                      className="rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2.5 text-xs font-medium text-[#B91C1C]"
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isBusy}
                  className={`inline-flex h-11 w-full items-center justify-center rounded-sm px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    verified
                      ? "bg-[#009A44]"
                      : submitting
                      ? "bg-[#00338D]/90"
                      : "bg-[#00338D] hover:bg-[#1E49E2]"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {verified ? (
                      <motion.span
                        key="btn-verified"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, transform: "scale(0.95)", filter: "blur(2px)" }
                        }
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 1, transform: "scale(1)", filter: "blur(0px)" }
                        }
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: EASE_OUT }}
                        className="inline-flex items-center gap-2"
                      >
                        <Check size={16} weight="bold" />
                        <span>Signed in</span>
                      </motion.span>
                    ) : submitting ? (
                      <motion.span
                        key="btn-submitting"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(2px)" }
                        }
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 1, filter: "blur(0px)" }
                        }
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14, ease: EASE_OUT }}
                        className="inline-flex items-center gap-2"
                      >
                        <CircleNotch
                          size={16}
                          weight="regular"
                          className="animate-[spin_650ms_linear_infinite]"
                        />
                        <span>Signing in</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="btn-idle"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(2px)" }
                        }
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 1, filter: "blur(0px)" }
                        }
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14, ease: EASE_OUT }}
                        className="inline-flex items-center gap-2"
                      >
                        <span>Sign in</span>
                        <ArrowRight size={15} weight="regular" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quiet Editorial Footer Note */}
      <p className="mt-6 text-center text-[11px] text-[#526075]">
        Protected session for authorized KPMG and client personas
      </p>
    </div>
  );
}
