"use client";

import { CheckIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import type { AssistantAction, CustomerAddressBody, Json } from "@dafne/contracts";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { Button } from "@dafne/frontend-ui/components/button";
import { Spinner } from "@dafne/frontend-ui/components/spinner";

type ClientAction = Json<AssistantAction>;
type WriteKind = Extract<
  ClientAction["kind"],
  | "propose_create_customer"
  | "propose_update_customer"
  | "propose_create_activity"
  | "propose_close_activity"
  | "propose_change_sales_order_status"
  | "propose_create_sales_order"
>;

const FIELDS = [
  "customer",
  "orderType",
  "type",
  "name",
  "email",
  "phone",
  "vatNumber",
  "fiscalCode",
  "birthDate",
  "dueDate",
  "notes",
] as const;

/** The fields to show, from the action's payload. */
function rows(action: ClientAction): [string, string][] {
  const payload = action.payload as Record<string, unknown>;
  if (action.kind === "propose_create_sales_order") {
    return [
      ["customer", String(payload.customer ?? "")],
      ["orderType", String(payload.type ?? "")],
    ];
  }
  const source = (
    action.kind === "propose_update_customer" ? payload.changes : payload.body
  ) as Record<string, unknown> | undefined;
  if (!source) {
    return [];
  }
  return FIELDS.flatMap((field) =>
    source[field] === undefined || source[field] === null || source[field] === ""
      ? []
      : [[field, String(source[field])] as [string, string]],
  );
}

/** The addresses a customer proposal gives (new ones, or those it changes). */
function addresses(action: ClientAction): CustomerAddressBody[] {
  const payload = action.payload as Record<string, unknown>;
  const source =
    action.kind === "propose_create_customer"
      ? payload.body
      : action.kind === "propose_update_customer"
        ? payload.changes
        : undefined;
  return ((source as { addresses?: CustomerAddressBody[] } | undefined)?.addresses ?? []);
}

/** An address on one line: "Via Roma 1, 20100 Milano (MI), IT". */
const addressLine = (address: CustomerAddressBody) =>
  [
    address.street,
    [address.postalCode, address.city, address.region && `(${address.region})`].filter(Boolean).join(" "),
    address.countryCode,
  ].join(", ");

/**
 * A write the assistant proposed: what it would do, and Confirm / Discard.
 * Confirming runs it as the user; once decided, it shows the outcome and a
 * link to the record.
 */
export function ActionCard({
  action,
  onDecide,
}: {
  action: ClientAction;
  onDecide: (id: number, decision: "confirm" | "reject") => Promise<void>;
}) {
  const t = useTranslations("assistantChat");
  const [pending, startTransition] = useTransition();
  const kind = action.kind as WriteKind;
  const payload = action.payload as Record<string, unknown>;

  const subject =
    kind === "propose_update_customer" || kind === "propose_close_activity"
      ? String(payload.name ?? "")
      : kind === "propose_change_sales_order_status"
        ? `#${String(payload.id)} · ${String(payload.customer ?? "")}`
        : null;

  const decide = (decision: "confirm" | "reject") =>
    startTransition(() => onDecide(action.id, decision));

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 text-card-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{t(`action.title.${kind}`)}</span>
        {action.status === "confirmed" && <Badge>{t("action.confirmed")}</Badge>}
        {action.status === "rejected" && <Badge variant="secondary">{t("action.rejected")}</Badge>}
      </div>
      {subject && <p className="text-muted-foreground">{subject}</p>}
      {kind === "propose_change_sales_order_status" && (
        <p>
          <Badge variant="outline">{String(payload.status)}</Badge>{" "}
          <span className="text-muted-foreground">
            {t("action.from", { from: String(payload.from) })}
          </span>
        </p>
      )}
      {rows(action).length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {rows(action).map(([field, value]) => (
            <div key={field} className="contents">
              <dt className="text-muted-foreground">{t(`fields.${field as (typeof FIELDS)[number]}`)}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {kind === "propose_create_sales_order" && (
        <table className="w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="font-normal">{t("fields.product")}</th>
              <th className="text-right font-normal">{t("fields.quantity")}</th>
            </tr>
          </thead>
          <tbody>
            {((payload.lines ?? []) as { product: string; quantity: number }[]).map((line, i) => (
              <tr key={i}>
                <td>{line.product}</td>
                <td className="text-right tabular-nums">{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {addresses(action).length > 0 && (
        <table className="w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="font-normal">{t("fields.addressType")}</th>
              <th className="font-normal">{t("fields.address")}</th>
            </tr>
          </thead>
          <tbody>
            {addresses(action).map((address) => (
              <tr key={address.type} className="align-top">
                <td className="pr-3">{t(`addressTypes.${address.type}`)}</td>
                <td className="break-words">{addressLine(address)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {action.status === "failed" && (
        <p className="text-destructive">{t("action.failed", { error: action.result?.error ?? "" })}</p>
      )}
      {action.status === "pending" && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => decide("reject")}>
            <XIcon data-icon="inline-start" />
            {t("action.reject")}
          </Button>
          <Button size="sm" disabled={pending} onClick={() => decide("confirm")}>
            {pending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
            {t("action.confirm")}
          </Button>
        </div>
      )}
      {action.status === "confirmed" && action.result?.resource && action.result.id && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/${action.result.resource}/${action.result.id}`} />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {t("action.open")}
          </Button>
        </div>
      )}
    </div>
  );
}
