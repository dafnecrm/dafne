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
import type * as React from "react";
import { useState, useTransition } from "react";
import type { QuotationStatus } from "@dafne/contracts";
import { Can } from "@dafne/frontend-permissions";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { DownloadPdfMenuItems } from "@dafne/frontend-documents/components/document-pdf-menu-items";
import type { PdfTemplate } from "@dafne/frontend-documents/components/document-pdf-menu";
import { QUOTATION_EDITABLE_STATUSES } from "../quotations-table.ts";

/**
 * Actions on the quotation's page: its next status (send a draft; accept,
 * which opens the sales order it creates at `<salesOrdersPath>/<id>`, or
 * reject a sent one), then a menu: edit (`<path>/<id>/edit`), its history
 * (in a sheet), its PDF (from `pdfTemplates`, none without them) and
 * delete, then back to the list at `path`. Below `sm` only the menu is
 * shown, with the next status at its top: each step is listed once
 * (`steps`) and rendered both ways, and each dialog once, outside.
 */
export function QuotationDetailActions({
  quotation,
  path,
  salesOrdersPath,
  pdfTemplates,
}: {
  quotation: Pick<QuotationDetail, "id" | "status">;
  path: string;
  salesOrdersPath: string;
  pdfTemplates: PdfTemplate[];
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
          type: "error",
          title: "Error",
          description: result.error,
        });
        return;
      }
      toast.add({
        type: "success",
        title: "Quotation status changed",
      });
      router.refresh();
    });

  const steps: {
    key: string;
    label: string;
    icon: React.ComponentType;
    primary?: boolean;
    /** Moves the status itself (a spinner while it runs), no dialog. */
    moves?: boolean;
    onSelect: () => void;
  }[] = [];
  if (quotation.status === "draft") {
    steps.push({
      key: "send",
      label: t("quotations.send"),
      icon: SendIcon,
      moves: true,
      onSelect: () => moveTo("sent"),
    });
  }
  if (quotation.status === "sent") {
    steps.push(
      {
        key: "reject",
        label: t("quotations.reject"),
        icon: XIcon,
        moves: true,
        onSelect: () => moveTo("rejected"),
      },
      {
        key: "accept",
        label: t("quotations.accept.action"),
        icon: CheckIcon,
        primary: true,
        onSelect: () => setAccepting(true),
      },
    );
  }

  return (
    <>
      {QUOTATION_EDITABLE_STATUSES.has(quotation.status) &&
        <Can I="update" a="Quotation">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            {t("common.edit")}
          </Button>
        </Can>}

      <Can I="changeStatus" a="Quotation">
        {steps.map(({ key, label, icon: Icon, primary, moves, onSelect }) => (
          <Button
            key={key}
            className="hidden sm:inline-flex"
            variant={primary ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={onSelect}
          >
            {pending && moves ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Icon data-icon="inline-start" />
            )}
            {label}
          </Button>
        ))}
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
          {(QUOTATION_EDITABLE_STATUSES.has(quotation.status) || steps.length > 0) && <DropdownMenuGroup className="sm:hidden">
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            {QUOTATION_EDITABLE_STATUSES.has(quotation.status) &&
              <Can I="update" a="Quotation">
                <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
                  <PencilIcon />
                  {t("common.edit")}
                </DropdownMenuItem>
              </Can>}
            {steps.length > 0 && (
              <Can I="changeStatus" a="Quotation">
                {steps.map(({ key, label, icon: Icon, onSelect }) => (
                  <DropdownMenuItem
                    key={key}
                    className="sm:hidden"
                    disabled={pending}
                    onClick={onSelect}
                  >
                    <Icon />
                    {label}
                  </DropdownMenuItem>
                ))}

              </Can>
            )}
            <DropdownMenuSeparator />
          </DropdownMenuGroup>}
          < DownloadPdfMenuItems
            resource="quotation"
            id={quotation.id}
            templates={pdfTemplates}
          />
          <DropdownMenuSeparator />
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
