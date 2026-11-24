"use client";

import {
  CheckIcon,
  EllipsisVerticalIcon,
  HistoryIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import type { QuotationStatus } from "@dafne/contracts";
import { Can } from "@dafne/frontend-permissions";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { changeQuotationStatus } from "../actions.ts";
import type { QuotationDetail } from "../types.ts";
import {
  AcceptQuotationDialog,
  DeleteQuotationDialog,
} from "./quotation-dialogs.tsx";
import { QuotationChangelogSheet } from "./quotation-changelog.tsx";
import { toast } from "@dafne/frontend-ui/components/toast";

/**
 * Actions on the quotation's page: its next status (send a draft; accept,
 * which opens the sales order it creates at `<salesOrdersPath>/<id>`, or
 * reject a sent one), then a menu: edit (`<path>/<id>/edit`), its history
 * (in a sheet) and delete, then back to the list at `path`.
 */
export function QuotationDetailActions({
  quotation,
  path,
  salesOrdersPath,
}: {
  quotation: Pick<QuotationDetail, "id" | "status">;
  path: string;
  salesOrdersPath: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [history, setHistory] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(quotation.id)}`;

  const moveTo = (status: QuotationStatus) =>
    startTransition(async () => {
      const result = await changeQuotationStatus(quotation.id, status);
      if ("error" in result) {
        toast.add({
          type: 'error',
          title: 'Error',
          description: result.error
        })
        return;
      }
      toast.add({
          type: 'success',
          title: 'Quotation status changed',
        })
      router.refresh();
    });

  return (
    <>
      <Can I="changeStatus" a="Quotation">
        {quotation.status === "draft" && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => moveTo("sent")}>
            {pending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
            {t("quotations.send")}
          </Button>
        )}
        {quotation.status === "sent" && (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => moveTo("rejected")}>
              {pending ? <Spinner data-icon="inline-start" /> : <XIcon data-icon="inline-start" />}
              {t("quotations.reject")}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => setAccepting(true)}>
              <CheckIcon data-icon="inline-start" />
              {t("quotations.accept.action")}
            </Button>
          </>
        )}
      </Can>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("quotations.singular")} ${quotation.id}`,
              })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Can I="update" a="Quotation">
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              {t("common.edit")}
            </DropdownMenuItem>
          </Can>
          <DropdownMenuItem onClick={() => setHistory(true)}>
            <HistoryIcon />
            {t("changelog.open")}
          </DropdownMenuItem>
          <Can I="delete" a="Quotation">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
              {t("common.delete")}
            </DropdownMenuItem>
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      <QuotationChangelogSheet
        quotationId={quotation.id}
        open={history}
        onOpenChange={setHistory}
      />
      {accepting && (
        <AcceptQuotationDialog
          quotation={quotation}
          salesOrdersPath={salesOrdersPath}
          onClose={() => setAccepting(false)}
        />
      )}
      {deleting && (
        <DeleteQuotationDialog
          quotation={quotation}
          path={path}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
