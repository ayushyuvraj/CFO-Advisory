"use client";

import { useEffect, useId, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const PREFERRED_INITIAL_SELECTOR = [
  "[data-autofocus]:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
].join(", ");

// Shared dialog stack so nested modals/drawers only let the topmost dialog handle Escape & Tab
const activeDialogStack: string[] = [];
let bodyLockCount = 0;
let savedBodyOverflow = "";
let savedBodyTouchAction = "";

function acquireBodyScrollLock() {
  if (typeof document === "undefined") return;
  if (bodyLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    savedBodyTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }
  bodyLockCount += 1;
}

function releaseBodyScrollLock() {
  if (typeof document === "undefined") return;
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.touchAction = savedBodyTouchAction;
  }
}

function isVisibleFocusable(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

export function useDialogFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  const dialogId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Always keep latest onClose without re-running the focus trap effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    activeDialogStack.push(dialogId);
    acquireBodyScrollLock();

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const rafId = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      // Never yank focus if the user has already focused an element inside this dialog
      if (
        document.activeElement instanceof HTMLElement &&
        container.contains(document.activeElement)
      ) {
        return;
      }

      // 1. Prefer explicit autofocus or first editable form control (NEVER the X close button)
      const preferred = Array.from(
        container.querySelectorAll<HTMLElement>(PREFERRED_INITIAL_SELECTOR)
      ).filter(isVisibleFocusable);

      if (preferred.length > 0) {
        preferred[0].focus();
        return;
      }

      // 2. Otherwise focus first non-close focusable element
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(isVisibleFocusable);

      const nonClose = focusables.filter(
        (el) => !el.hasAttribute("data-dialog-close")
      );

      if (nonClose.length > 0) {
        nonClose[0].focus();
      } else if (container.tabIndex >= -1) {
        container.focus();
      } else if (focusables.length > 0) {
        focusables[0].focus();
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      // Only the topmost dialog in the stack responds to Escape & Tab
      if (activeDialogStack[activeDialogStack.length - 1] !== dialogId) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(isVisibleFocusable);

      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);

      const idx = activeDialogStack.lastIndexOf(dialogId);
      if (idx !== -1) {
        activeDialogStack.splice(idx, 1);
      }
      releaseBodyScrollLock();

      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) {
        // Restore focus only if no other dialog is still on top
        if (activeDialogStack.length === 0) {
          previous.focus();
        }
      }
    };
  }, [isOpen, containerRef, dialogId]);
}
