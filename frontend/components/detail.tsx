import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { Children, Fragment, type ReactNode } from "react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription, ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle
} from "@/components/ui/item";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

/*
 * Read-only detail lists, e.g. on a record's page:
 *
 *   <DetailSection title="Profile">
 *     <Detail icon={MailIcon} label="Email" actions={<CopyButton … />}>
 *       {user.email}
 *     </Detail>
 *     {user.banned && <Detail icon={BanIcon} label="Ban reason">…</Detail>}
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

/**
 * A titled item group of details. Pass Detail elements directly (not in
 * fragments); false/null are skipped.
 *
 * Variants: `default` frames the details like a Card; `plain` has no
 * frame and no padding around the details.
 */
export function DetailSection({
  title,
  variant,
  separator,
  className,
  groupClassName,
  children,
}: {
  title?: string;
  /** Draws a line between details. */
  separator?: boolean;
  /** Extra classes for the section, e.g. a grid placement. */
  className?: string;
  /** Extra classes for the item group, e.g. a grid layout. */
  groupClassName?: string;
  children: ReactNode;
} & VariantProps<typeof detailSectionVariants>) {
  return (
    <Card
      data-slot="detail-section"
      data-variant={variant}
      className={cn(detailSectionVariants({ variant }), className)}>
      {title && (
        <CardHeader className={cn(variant === "plain" && "px-0")}>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(variant === "plain" && "px-0")}>
        <ItemGroup
          // Details read the variant from here (see Detail).
          data-variant={variant}
          className={groupClassName ?? "grid grid-cols-1 sm:grid-cols-2"}
        >
          {Children.toArray(children).map((child, index) => (
            <Fragment key={index}>
              {index > 0 && separator && <ItemSeparator className="my-0" />}
              {child}
            </Fragment>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

/**
 * One value: an icon, a muted label and the value under it, with optional
 * actions on the right (e.g. a copy or edit button).
 */
export function Detail({
  icon: Icon,
  label,
  actions,
  children,
}: {
  icon: LucideIcon;
  label: string;
  /** Shown at the end of the row, in ItemActions. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Item
      size="sm"
      // min-w-0: in a grid, let long values truncate instead of overflowing.
      className="min-w-0 rounded-none p-0 items-start"
    >
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent className="min-w-0 items-start">
        <ItemDescription>{label}</ItemDescription>
        {/* Values can be long (IDs, ban reasons): let them wrap. */}
        <ItemTitle className="line-clamp-none max-w-full flex-wrap wrap-break-word">
          {children}
        </ItemTitle>
      </ItemContent>
      {actions && <ItemActions>{actions}</ItemActions>}
    </Item>
  );
}
