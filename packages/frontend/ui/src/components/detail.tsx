import { cn } from "cn";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "./item";

/** A client component: it lives in its own file. */
export { DetailSection } from "@dafne/frontend-ui/components/detail-section";

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
