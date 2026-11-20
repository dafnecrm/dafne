"use client";

import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Can } from "@dafne/frontend-permissions";
import { useState } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import {
  DeleteDocumentTemplateDialog,
  type DocumentTemplateRef,
} from "./document-template-dialogs";

/** Actions on the document template's page, in a menu. */
export function DocumentTemplateDetailActions({
  documentTemplate,
}: {
  documentTemplate: DocumentTemplateRef;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();
  const href = `/document-templates/${encodeURIComponent(documentTemplate.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("documentTemplates.singular")} ${documentTemplate.id}`,
              })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Can I="update" a="DocumentTemplate">
            <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
              <PencilIcon />
              {t("common.edit")}
            </DropdownMenuItem>
          </Can>
          <Can I="delete" a="DocumentTemplate">
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
      {deleting && (
        <DeleteDocumentTemplateDialog
          documentTemplate={documentTemplate}
          then="list"
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
