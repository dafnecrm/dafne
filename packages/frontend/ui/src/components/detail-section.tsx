"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import {
  Children,
  Fragment,
  useEffect,
  useEffectEvent,
  useRef,
  type ReactNode,
} from "react";
import { ItemSeparator } from "./item";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@dafne/frontend-ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dafne/frontend-ui/components/collapsible";

/*
 * A client component (onOpenChange, the mount effect), so it can't take
 * components as props: Detail, which takes an icon, stays in detail.tsx.
 */

/** Card styles per DetailSection variant. */
const detailSectionVariants = cva("", {
  variants: {
    variant: {
      /** Looks like a Card: rounded, card background, light ring. */
      default: "",
      /** No border; details have no padding. */
      plain: "ring-0",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/**
 * The details' list layout. Not ItemGroup: its size-based gaps
 * (`has-data-[size=sm]:gap-2.5`, and every Detail is sm) would win over
 * these.
 */
const detailGroupVariants = cva("w-full gap-6 @container", {
  variants: {
    groupVariant: {
      default: "flex flex-col",
      horizontal: "flex flex-col @2xl:flex-row @2xl:flex-wrap",
      grid: "grid grid-cols-1 @2xl:grid-cols-2",
    },
  },
  defaultVariants: {
    groupVariant: "default",
  },
});

/**
 * A titled item group of details. Pass Detail elements directly (not in
 * fragments); false/null are skipped.
 *
 * `groupClassName` is merged with the grid: `xl:grid-cols-3` changes only
 * that, `flex` stacks the children in one column.
 *
 * `actions` (e.g. buttons) go at the end of the header, in CardAction.
 *
 * With a title, the section collapses: clicking the title hides the
 * details (open at first, unless `defaultOpen={false}`).
 * `onOpenChange` runs each time it opens or closes, and once on mount
 * (with `true`) when it starts open.
 *
 * Variants:
 * - `default` frames the details like a Card;
 * - `plain` has no frame and no padding around the details;
 */
export function DetailSection({
  title,
  actions,
  variant,
  groupVariant,
  separator,
  className,
  groupClassName,
  defaultOpen = true,
  isCollapsible = true,
  onOpenChange,
  children,
}: {
  /** Also the button that collapses the section. */
  title?: string;
  /** Shown at the end of the header, in CardAction. */
  actions?: ReactNode;
  /** Draws a line between details. */
  separator?: boolean;
  /** Extra classes for the section card. */
  className?: string;
  /** Extra classes for the item group. */
  groupClassName?: string;
  /** Whether the details show at first; the title toggles them. */
  defaultOpen?: boolean;
  /** Wheter the details section is collapsible. */
  isCollapsible?: boolean,
  /**
   * Called with `true` when the section opens (also on mount, when it
   * starts open) and `false` when it closes, e.g. to load its data lazily.
   */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
} & VariantProps<typeof detailSectionVariants>
  & VariantProps<typeof detailGroupVariants>) {
  const startsOpen = defaultOpen || !title;
  const mounted = useRef(false);
  const onMount = useEffectEvent(() => {
    if (startsOpen) {
      onOpenChange?.(true);
    }
  });
  // The ref keeps StrictMode's second effect from calling it twice.
  useEffect(() => {
    if (mounted.current) {
      return;
    }
    mounted.current = true;
    onMount();
  }, []);

  return (
    <Collapsible
      // Without a title there is nothing to click: it stays open.
      defaultOpen={startsOpen}
      disabled={!isCollapsible}
      onOpenChange={(open) => onOpenChange?.(open)}
      render={
        <Card
          data-slot="detail-section"
          data-variant={variant}
          className={cn(detailSectionVariants({ variant }), className)}
        />
      }
    >
      {(title || actions) && (
        <CardHeader className={cn(variant === "plain" && "px-0")}>
          {title && (
            <CardTitle>
              <h2>
                <CollapsibleTrigger className={cn("group/trigger -ml-2 flex items-center gap-1 rounded-md px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", isCollapsible && "cursor-pointer")}>
                  {isCollapsible && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open/trigger:rotate-90" />}
                  {title}
                </CollapsibleTrigger>
              </h2>
            </CardTitle>
          )}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CollapsibleContent
        render={<CardContent className={cn(variant === "plain" && "px-0")} />}
      >
        <div
          role="list"
          data-slot="item-group"
          data-variant={groupVariant}
          className={cn(detailGroupVariants({ groupVariant }), groupClassName)}
        >
          {Children.toArray(children).map((child, index) => (
            <Fragment key={index}>
              {index > 0 && separator && <ItemSeparator className="my-0" />}
              {child}
            </Fragment>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
