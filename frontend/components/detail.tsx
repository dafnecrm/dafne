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

/** Item group styles per DetailSection variant. */
const detailSectionVariants = cva("group/details gap-0", {
  variants: {
    variant: {
      /** No border; details have no padding (see Detail). */
      default: "rounded-lg border",
      /** Rounded border; details are padded. */
      plain: "",
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
 * Variants: `default` draws a rounded border and pads each detail;
 * `outline` has no border and no padding around the details.
 */
export function DetailSection({
  title,
  variant,
  separator,
  className,
  groupClassName,
  children,
}: {
  title: string;
  /** Draws a line between details. */
  separator?: boolean;
  /** Extra classes for the section, e.g. a grid placement. */
  className?: string;
  /** Extra classes for the item group, e.g. a grid layout. */
  groupClassName?: string;
  children: ReactNode;
} & VariantProps<typeof detailSectionVariants>) {
  return (
    <section
      data-slot="detail-section"
      data-variant={variant}
      className={cn("flex flex-col gap-2", className)}
    >
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <ItemGroup
        // Details read the variant from here (see Detail).
        data-variant={variant}
        className={cn(detailSectionVariants({ variant }), groupClassName)}
      >
        {Children.toArray(children).map((child, index) => (
          <Fragment key={index}>
            {index > 0 && separator && <ItemSeparator className="my-0" />}
            {child}
          </Fragment>
        ))}
      </ItemGroup>
    </section>
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
      className="rounded-none group-data-[variant=default]/details:px-0 group-data-[variant=default]/details:py-0"
    >
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemDescription>{label}</ItemDescription>
        {/* Values can be long (IDs, ban reasons): let them wrap. */}
        <ItemTitle className="line-clamp-none flex-wrap break-words">
          {children}
        </ItemTitle>
      </ItemContent>
      {actions && <ItemActions>{actions}</ItemActions>}
    </Item>
  );
}
