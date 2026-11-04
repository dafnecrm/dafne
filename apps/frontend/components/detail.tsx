import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { Children, Fragment, type ReactNode } from "react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription, ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle
} from "@dafne/frontend-ui/components/item";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@dafne/frontend-ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dafne/frontend-ui/components/collapsible";

/*
 * Read-only detail lists, e.g. on a record's page:
 *
 *   <DetailSection title="Profile" actions={<Button …>Edit</Button>}>
 *     <Detail icon={MailIcon} label="Email" actions={<CopyButton … />}>
 *       {user.email}
 *     </Detail>
 *     {user.banned && <Detail icon={BanIcon} label="Ban reason">…</Detail>}
 *     <Detail icon={TextIcon} label="Notes" wide>…</Detail>
 *   </DetailSection>
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

/** The details' grid: one column on phones, up to four on wide screens. */
const DETAIL_GRID =
  "grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

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
 *
 * Variants: `default` frames the details like a Card; `plain` has no
 * frame and no padding around the details.
 */
export function DetailSection({
  title,
  actions,
  variant,
  separator,
  className,
  groupClassName,
  defaultOpen = true,
  isCollapsible = true,
  children,
}: {
  /** Also the button that collapses the section. */
  title?: string;
  /** Shown at the end of the header, in CardAction. */
  actions?: ReactNode;
  /** Draws a line between details. */
  separator?: boolean;
  /** Extra classes for the section, e.g. a grid placement. */
  className?: string;
  /** Extra classes for the item group, merged with the grid. */
  groupClassName?: string;
  /** Whether the details show at first; the title toggles them. */
  defaultOpen?: boolean;
  /** Wheter the details section is collapsible. */
  isCollapsible?: boolean,
  children: ReactNode;
} & VariantProps<typeof detailSectionVariants>) {
  return (
    <Collapsible
      // Without a title there is nothing to click: it stays open.
      defaultOpen={defaultOpen || !title}
      disabled={!isCollapsible}
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
                <CollapsibleTrigger className={cn("group/trigger -ml-1 flex items-center gap-1 rounded-md px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", isCollapsible && "cursor-pointer")}>
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
        <ItemGroup
          // Details read the variant from here (see Detail).
          data-variant={variant}
          className={cn(DETAIL_GRID, groupClassName)}
        >
          {Children.toArray(children).map((child, index) => (
            <Fragment key={index}>
              {index > 0 && separator && <ItemSeparator className="my-0" />}
              {child}
            </Fragment>
          ))}
        </ItemGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * One value: an icon, a muted label and the value under it, with optional
 * actions on the right (e.g. a copy or edit button). `wide` gives a long
 * value (rich text, notes) the whole row, laid out as a block.
 */
export function Detail({
  icon: Icon,
  label,
  actions,
  wide,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  /** Shown at the end of the row, in ItemActions. */
  actions?: ReactNode;
  /** The whole row of the grid, and the value as a block (paragraphs, lists). */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Item
      size="sm"
      // min-w-0: in a grid, let long values truncate instead of overflowing.
      className={cn(
        "min-w-0 rounded-none p-0 items-start",
        wide && "col-span-full",
        className
      )}
    >
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent className="min-w-0 items-start">
        <ItemDescription>{label}</ItemDescription>
        {/* Values can be long (IDs, ban reasons): let them wrap. */}
        <ItemTitle
          className={cn(
            "line-clamp-none max-w-full flex-wrap wrap-break-word",
            wide && "block w-full"
          )}
        >
          {children}
        </ItemTitle>
      </ItemContent>
      {actions && <ItemActions>{actions}</ItemActions>}
    </Item>
  );
}
