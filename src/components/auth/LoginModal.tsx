"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { SignInCard } from "@/components/auth/SignInCard";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

function LoginModalContent({ onClose }: { onClose: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSafeClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [submitting, onClose]);

  useDialogFocusTrap(true, panelRef, handleSafeClose);

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
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        onClick={handleSafeClose}
        className="fixed inset-0 bg-[#0C233C]/40 backdrop-blur-[6px]"
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, transform: "scale(0.96) translateY(8px)" }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, transform: "scale(1) translateY(0px)" }
        }
        exit={
          prefersReducedMotion
            ? { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }
            : {
                opacity: 0,
                transform: "scale(0.97) translateY(6px)",
                transition: { duration: 0.17, ease: EASE_OUT },
              }
        }
        transition={{ duration: 0.24, ease: EASE_OUT }}
        onWheel={(e) => e.stopPropagation()}
        className="relative z-10 flex w-full max-w-[400px] max-h-[90vh] flex-col overflow-y-auto overscroll-contain focus:outline-none"
      >
        <SignInCard
          variant="modal"
          onClose={handleSafeClose}
          onSubmittingChange={setSubmitting}
        />
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
