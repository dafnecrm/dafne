"use client";

import { FileDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import { documentPdfHref } from "../links.ts";
import type { PdfTemplate } from "./document-pdf-menu.tsx";

/**
 * The PDF of a record as items of a dropdown menu (e.g. a detail page's
 * actions), each opening it in a new tab: "PDF" with the default template
 * (the backend picks it) or, without one, the first of `templates`; with two
 * templates or more, a submenu to pick one. Nothing while there is none.
 */
export function DownloadPdfMenuItems({
  resource,
  id,
  templates,
}: {
  resource: string;
  id: string | number;
  templates: PdfTemplate[];
}) {
  const t = useTranslations("documents");
  if (templates.length === 0) {
    return null;
  }
  // Without a default the backend has nothing to pick: the item opens the first template.
  const main = templates.some((template) => template.isDefault)
    ? undefined
    : templates[0];
  const link = (template?: PdfTemplate) => (
    <a
      href={documentPdfHref(resource, id, template?.id)}
      target="_blank"
      rel="noopener"
    />
  );

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
        <DropdownMenuItem render={link(main)}>
          <FileDownIcon />
          {t("pdf")}
        </DropdownMenuItem>
        {templates.length > 1 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileDownIcon />
              <span className="truncate">{t("choose")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="truncate">{t("choose")}</span>
                  </DropdownMenuLabel>
                  {templates.map((template) => (
                  <DropdownMenuItem key={template.id} render={link(template)}>
                    {template.name}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {t(`languages.${template.language}`)}
                      {template.isDefault && ` · ${t("defaultTemplate")}`}
                    </span>
                  </DropdownMenuItem>
                ))}
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}
      </DropdownMenuGroup>
    </>
  );
}
