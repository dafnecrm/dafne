"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dafne/frontend-ui/components/alert-dialog";

type IsDirty = () => boolean;

type Register = (isDirty: IsDirty) => () => void;

/** A link to follow, or a history entry to go to (Back/Forward). */
type Pending =
  | { kind: "href"; href: string }
  | { kind: "traverse"; key: string };

// The bits of the Navigation API used here. Not lib.dom's types: the app
// typechecks these sources with a TypeScript whose lib.dom lacks them.
type MinimalNavigateEvent = Event & {
  navigationType: "push" | "replace" | "reload" | "traverse";
  destination: { key: string | null };
};
type NavigateListener = (e: MinimalNavigateEvent) => void;
type MinimalNavigation = {
  traverseTo(key: string): unknown;
  addEventListener(type: "navigate", listener: NavigateListener): void;
  removeEventListener(type: "navigate", listener: NavigateListener): void;
};

/** The Navigation API, where the browser has it. */
const navigationApi = () =>
  (window as { navigation?: MinimalNavigation }).navigation;

const LeaveGuardContext = createContext<Register | null>(null);

/**
 * Asks before leaving a page whose form has unsaved changes
 * (`useResetOnLeave` registers the visible form here).
 *
 * The question has to come before the navigation: when Next hides a page
 * (React <Activity>), it has already left it. So a capture-phase listener
 * stops same-origin link clicks (every `next/link`) while the form is
 * dirty, and opens a dialog. "Discard" then navigates with the router.
 * Reloads, closed tabs and external links get the browser's own prompt
 * (`beforeunload`). Back/Forward is asked through the Navigation API
 * (`navigate`, before the router's popstate), where the browser lets the
 * traversal be cancelled (it needs a recent user interaction); elsewhere it
 * goes through and the form is reset as usual.
 */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("form.leave");
  const router = useRouter();
  const checks = useRef(new Set<IsDirty>());
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  // Lets the traversal "Leave without saving" starts through the guard.
  const skipNextTraverse = useRef(false);

  const register = useCallback<Register>((isDirty) => {
    checks.current.add(isDirty);
    setActive(true);
    return () => {
      checks.current.delete(isDirty);
      setActive(checks.current.size > 0);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    const isDirty = () => [...checks.current].some((check) => check());

    const onClick = (e: MouseEvent) => {
      const href = interceptedHref(e);
      if (href && isDirty()) {
        e.preventDefault();
        e.stopPropagation();
        setPending({ kind: "href", href });
      }
    };
    const onNavigate = (e: MinimalNavigateEvent) => {
      if (e.navigationType !== "traverse") {
        return;
      }
      if (skipNextTraverse.current) {
        skipNextTraverse.current = false;
        return;
      }
      const key = e.destination.key;
      if (e.cancelable && key && isDirty()) {
        e.preventDefault();
        setPending({ kind: "traverse", key });
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("beforeunload", onBeforeUnload);
    const navigation = navigationApi();
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      navigation?.removeEventListener("navigate", onNavigate);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);

  const leave = () => {
    if (pending?.kind === "href") {
      router.push(pending.href);
    } else if (pending?.kind === "traverse") {
      const navigation = navigationApi();
      if (navigation) {
        skipNextTraverse.current = true;
        navigation.traverseTo(pending.key);
      }
    }
    setPending(null);
  };

  return (
    <LeaveGuardContext.Provider value={register}>
      {children}
      <AlertDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={leave}>
              {t("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeaveGuardContext.Provider>
  );
}

/**
 * Registers `isDirty` with the page's LeaveGuardProvider while the
 * component is shown (a page hidden by <Activity> unregisters). Does
 * nothing without a provider or when `enabled` is false.
 */
export function useLeaveGuard(isDirty: IsDirty, enabled = true) {
  const register = useContext(LeaveGuardContext);
  const latest = useRef(isDirty);
  useLayoutEffect(() => {
    latest.current = isDirty;
  });
  const check = useMemo(() => () => latest.current(), []);

  useLayoutEffect(() => {
    if (!register || !enabled) {
      return;
    }
    return register(check);
  }, [register, enabled, check]);
}

/**
 * The in-app path a click would navigate to, or null when the click isn't
 * a plain same-origin link to another page (modifier keys, new tabs,
 * downloads, other origins and hash-only changes go through).
 */
function interceptedHref(e: MouseEvent): string | null {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  ) {
    return null;
  }
  const anchor =
    e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }
  const target = anchor.getAttribute("target");
  if ((target && target !== "_self") || anchor.hasAttribute("download")) {
    return null;
  }
  const url = new URL(anchor.href);
  if (url.origin !== window.location.origin) {
    return null;
  }
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }
  return url.pathname + url.search + url.hash;
}
