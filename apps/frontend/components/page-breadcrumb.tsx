"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import {
  createContext,
  Fragment,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dafne/frontend-ui/components/breadcrumb";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { findNavItem } from "@/lib/navigation";

/*
 * Breadcrumb of the current page, every level:
 *
 *   CRM › Customers › Acme › Edit
 *
 * The section and the page come from the navigation. The rest are the URL's
 * segments: a fixed one is named after itself ("new" → "New"), and an id
 * shows what its page puts in <BreadcrumbLabel> (the record's name, as in
 * the page title).
 */

type Labels = Record<string, string>;

const LabelsContext = createContext<{
  labels: Labels;
  setLabel: (href: string, label: string | undefined) => void;
}>({ labels: {}, setLabel: () => {} });

/** Holds the labels pages give to their URL; wraps the header and the pages. */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Labels>({});
  const setLabel = (href: string, label: string | undefined) =>
    setLabels((current) => {
      if (current[href] === label) return current;
      const next = { ...current };
      if (label === undefined) delete next[href];
      else next[href] = label;
      return next;
    });
  return (
    <LabelsContext value={{ labels, setLabel }}>{children}</LabelsContext>
  );
}

/**
 * Names a level of the breadcrumb, e.g. the record of a detail page:
 *
 *   <BreadcrumbLabel href={`/customers/${customer.id}`} label={customer.name} />
 *
 * Renders nothing. Hidden pages (kept mounted by <Activity>) drop their
 * label, since their effects are cleaned up.
 */
export function BreadcrumbLabel({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { setLabel } = useContext(LabelsContext);
  useEffect(() => {
    setLabel(href, label);
    return () => setLabel(href, undefined);
    // setLabel only changes state, so it's left out on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, label]);
  return null;
}

/**
 * The breadcrumb, behind a Suspense boundary: the URL isn't known when
 * prerendering dynamic routes.
 */
export function PageBreadcrumb() {
  return (
    <Suspense fallback={null}>
      <ActiveBreadcrumb />
    </Suspense>
  );
}

interface Level {
  href: string;
  /** undefined: an id whose page hasn't named it yet. */
  label: string | undefined;
}

/**
 * The label of a fixed segment: its `breadcrumb` message ("new", "edit"),
 * else the segment itself ("audit-log" → "Audit log").
 */
function useSegmentLabel() {
  const t = useTranslations("breadcrumb");
  return (segment: string) => {
    if (t.has(segment as never)) return t(segment as never);
    const words = decodeURIComponent(segment).replace(/[-_]+/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
}

function ActiveBreadcrumb() {
  const pathname = usePathname();
  const params = useParams();
  const { labels } = useContext(LabelsContext);
  const active = findNavItem(pathname);
  const t = useTranslations("nav");
  const segmentLabel = useSegmentLabel();
  if (!active) return null;

  const dynamic = new Set(
    Object.values(params)
      .flat()
      .map((value) => encodeURIComponent(decodeURIComponent(String(value)))),
  );
  const levels: Level[] = [];
  if (active.section.href !== active.item.href || active.section.title !== active.item.title)
    levels.push({ href: active.section.href, label: t(active.section.title) });
  levels.push({ href: active.item.href, label: t(active.item.title) });

  // Segments after the page, e.g. "/customers" + "/abc" + "/edit".
  const rest = pathname
    .slice(active.item.href === "/" ? 1 : active.item.href.length)
    .split("/")
    .filter(Boolean);
  let href = active.item.href === "/" ? "" : active.item.href;
  for (const segment of rest) {
    href += `/${segment}`;
    levels.push({
      href,
      label: labels[href] ?? (dynamic.has(segment) ? undefined : segmentLabel(segment)),
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {levels.map((level, i) => {
          const last = i === levels.length - 1;
          // On small screens only the current page shows.
          const hidden = last ? undefined : "hidden md:block";
          const label = level.label ?? <Skeleton className="h-4 w-24" />;
          return (
            <Fragment key={`${i}:${level.href}`}>
              {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className={hidden}>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={level.href} />}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
