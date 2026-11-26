import type {
  QuotationSortField,
  QuotationStatus,
  QuotationFilterField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import { type QuotationsMessageKey } from "./messages/index.ts";
import { AlarmClockOffIcon, CircleCheckIcon, CircleIcon, CircleXIcon, LucideIcon, SendIcon } from "lucide-react";

/** Quotation status icons */
export const QUOTATION_STATUS_ICONS: Record<QuotationStatus, LucideIcon> = {
  draft: CircleIcon,
  sent: SendIcon,
  accepted: CircleCheckIcon,
  expired: AlarmClockOffIcon,
  rejected: CircleXIcon,
};


/** Labels (message keys) of the status values. */
export const QUOTATION_STATUS_OPTIONS = [
  { value: "draft", label: "quotations.status.draft" },
  { value: "sent", label: "quotations.status.sent" },
  { value: "accepted", label: "quotations.status.accepted" },
  { value: "rejected", label: "quotations.status.rejected" },
  { value: "expired", label: "quotations.status.expired" },
] satisfies { value: QuotationStatus; label: QuotationsMessageKey }[];

/** Sort of the list without `?sort=`. */
export const QUOTATIONS_DEFAULT_SORT = { id: "id", desc: true };

/** Editable states for a quotation */
export const QUOTATION_EDITABLE_STATUSES: Set<QuotationStatus> = new Set(["draft"])

/** A quotations table's config: its path is always set (detail links use it). */
export type QuotationsTableConfig = DataTableConfig & { path: string };

export interface QuotationsTableOptions {
  /** Path of the app's quotations list page, e.g. "/quotations". */
  path: string;
}

/**
 * The quotations table: plain data with no server-only imports, so the
 * server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineQuotationsTable({
  path,
}: QuotationsTableOptions): QuotationsTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "status",
      "validUntil",
      "createdAt",
      "updatedAt",
    ] satisfies QuotationSortField[],
    defaultSort: QUOTATIONS_DEFAULT_SORT,
    // { field: "…" satisfies QuotationFilterField, label: "…" satisfies QuotationsMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies QuotationFilterField,
        label: "quotations.fields.id" satisfies QuotationsMessageKey,
      },
      {
        field: "status" satisfies QuotationFilterField,
        label: "quotations.fields.status" satisfies QuotationsMessageKey,
        options: QUOTATION_STATUS_OPTIONS,
      },
      {
        field: "customerId" satisfies QuotationFilterField,
        label: "quotations.fields.customerId" satisfies QuotationsMessageKey,
      },
      {
        field: "typeId" satisfies QuotationFilterField,
        label: "quotations.fields.typeId" satisfies QuotationsMessageKey,
      },
    ],
  });
  return { ...config, path };
}
