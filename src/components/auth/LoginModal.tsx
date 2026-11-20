"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeSlash, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

const PERSONAS = [
  {
    id: "kpmg",
    label: "KPMG Lead",
    emailLabel: "Advisory corporate email",
    guidance: "Use your designated KPMG Lead credentials.",
  },
  {
    id: "client",
    label: "Client Persona",
    emailLabel: "Client persona email",
    guidance: "Use the email and passcode assigned for your engagement.",
  },
] as const;

type Persona = (typeof PERSONAS)[number];

const fieldClass = "min-h-12 w-full rounded-sm border border-muted-ink/55 bg-white px-3.5 text-base text-kpmg-navy focus-visible:border-cobalt focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1";
const focusClass = "focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2";

function LoginModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Partial<Record<Persona["id"], HTMLButtonElement | null>>>({});
  const { signInWithCredentials, signInAsClient } = useAuth();

  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSafeClose = useCallback(() => {
    if (!submitting) onClose();
  }, [submitting, onClose]);

  useDialogFocusTrap(true, panelRef, handleSafeClose);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const rootStyle = document.documentElement.style;
    const syncViewport = () => {
      rootStyle.setProperty("--login-viewport-top", `${viewport.offsetTop}px`);
      rootStyle.setProperty("--login-viewport-height", `${viewport.height}px`);
    };
    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
      rootStyle.removeProperty("--login-viewport-top");
      rootStyle.removeProperty("--login-viewport-height");
    };
  }, []);

  const selectPersona = (next: Persona) => {
    if (submitting || next === persona) return;
    setPersona(next);
    setErrorMessage(null);
    setEmail("");
    setPasscode("");
    setShowPassword(false);
  };

  const handlePersonaKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: Persona;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight":
        next = persona.id === "kpmg" ? PERSONAS[1] : PERSONAS[0];
        break;
      case "Home":
        next = PERSONAS[0];
        break;
      case "End":
        next = PERSONAS[1];
        break;
      default:
        return;
    }
    event.preventDefault();
    selectPersona(next);
    tabRefs.current[next.id]?.focus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (emailRef.current?.validity.typeMismatch) {
      setErrorMessage("Enter a valid email address.");
      emailRef.current.focus();
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (persona.id === "kpmg") {
        await signInWithCredentials(email, passcode);
      } else {
        await signInAsClient(email, passcode);
      }
      if (pathname !== "/workflows") router.push("/workflows");
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

  return (
    <div
      className="fixed inset-x-0 top-[var(--login-viewport-top,0px)] z-[110] h-[var(--login-viewport-height,100dvh)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      aria-describedby="login-workspace-name"
    >
      <div className="absolute inset-x-0 top-18 bottom-0 grid grid-rows-[minmax(0,1fr)] place-items-center p-3 sm:p-5">
        <div
          onClick={handleSafeClose}
          className="absolute inset-0 bg-kpmg-navy/65"
          aria-hidden="true"
        />

        <div
          ref={panelRef}
          tabIndex={-1}
          className="relative w-full min-h-0 max-h-full max-w-[960px] overflow-y-auto overscroll-contain rounded-sm bg-white text-kpmg-navy shadow-[0_24px_64px_rgba(12,35,60,0.24)] focus:outline-none md:grid md:grid-cols-[2fr_3fr]"
        >
          <div className="relative flex min-h-1.5 items-end bg-kpmg-blue md:min-h-full" aria-hidden="true">
            <div className="absolute inset-x-0 top-1.5 hidden h-[60%] overflow-hidden md:block">
              <Image
                src="/images/kpmg_brand_images/multicolor-cubes-abstract-1.jpg"
                alt=""
                fill
                sizes="384px"
                className="object-cover object-right"
              />
            </div>
            <div className="absolute inset-x-0 top-0 flex h-1.5">
              <span className="w-2/3 bg-pacific" />
              <span className="grow bg-ice" />
              <span className="w-1/12 bg-purple" />
            </div>
            <p className="relative hidden max-w-xs px-8 pt-6 pb-9 text-[clamp(1.9rem,3.2vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-white md:block lg:px-10">
              Your MS-F&amp;A workspace
            </p>
          </div>

          <div className="min-w-0 px-5 pt-7 pb-6 sm:px-8 sm:pt-9 sm:pb-8 lg:px-12 lg:pt-12 lg:pb-11">
            <div className="flex items-start justify-between gap-4">
              <h2 id="login-modal-title" className="text-2xl leading-tight font-semibold tracking-[-0.035em] sm:text-3xl lg:text-[2.35rem]">
                Sign in to Workflows
              </h2>
              <button
                type="button"
                data-dialog-close="true"
                disabled={submitting}
                onClick={handleSafeClose}
                aria-label="Close sign in dialog"
                className={`-mt-1.5 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-kpmg-navy hover:bg-surface disabled:opacity-50 ${focusClass}`}
              >
                <X size={21} weight="light" />
              </button>
            </div>

            <p id="login-workspace-name" className="mt-1 text-sm font-semibold text-kpmg-blue">
              Managed Services Finance &amp; Accounting
            </p>

            <div role="tablist" aria-label="Sign in mode" className="mt-5 grid grid-cols-2 rounded-sm bg-surface p-1">
              {PERSONAS.map((option) => (
                <button
                  key={option.id}
                  ref={(element) => { tabRefs.current[option.id] = element; }}
                  id={`login-tab-${option.id}`}
                  type="button"
                  role="tab"
                  aria-selected={persona.id === option.id}
                  aria-controls="login-persona-panel"
                  tabIndex={persona.id === option.id ? 0 : -1}
                  disabled={submitting}
                  onClick={() => selectPersona(option)}
                  onKeyDown={handlePersonaKey}
                  className={`min-h-11 rounded-sm px-1.5 text-sm font-semibold ${focusClass} ${persona.id === option.id ? "border-b-2 border-cobalt bg-white text-kpmg-blue" : "text-muted-ink hover:text-kpmg-navy"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div id="login-persona-panel" role="tabpanel" aria-labelledby={`login-tab-${persona.id}`}>
              <p id="login-guidance" className="mt-3 text-sm leading-relaxed text-muted-ink">{persona.guidance}</p>

              <form onSubmit={handleSubmit} aria-busy={submitting} className="mt-5 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-sm font-medium">{persona.emailLabel}</label>
                  <input
                    ref={emailRef}
                    id="auth-email"
                    data-autofocus="true"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    readOnly={submitting}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? "login-guidance login-error-alert" : "login-guidance"}
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-passcode" className="block text-sm font-medium">Passcode</label>
                  <div className="relative">
                    <input
                      id="auth-passcode"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      readOnly={submitting}
                      value={passcode}
                      onChange={(event) => {
                        setPasscode(event.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={errorMessage ? "login-error-alert" : undefined}
                      className={`${fieldClass} pr-13`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                      className={`absolute top-0.5 right-0.5 inline-flex size-11 items-center justify-center rounded-sm text-muted-ink hover:bg-surface hover:text-kpmg-navy ${focusClass}`}
                    >
                      {showPassword ? <EyeSlash size={19} weight="light" /> : <Eye size={19} weight="light" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p id="login-error-alert" role="alert" className="rounded-sm bg-red-50 px-3 py-2.5 text-sm text-red-800">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`mt-2 inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-sm bg-kpmg-blue px-4 py-3 text-sm font-semibold text-white hover:bg-cobalt disabled:cursor-wait disabled:opacity-70 ${focusClass}`}
                >
                  {submitting ? "Signing in…" : "Sign in to Workflows"}
                  <ArrowRight size={18} weight="light" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginModal() {
  const { isLoginOpen, closeLogin } = useAuth();

  if (!isLoginOpen || typeof document === "undefined") return null;
  return createPortal(<LoginModalContent onClose={closeLogin} />, document.body);
}
