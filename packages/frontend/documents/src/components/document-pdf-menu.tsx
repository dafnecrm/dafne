"use client";

import { ChevronDownIcon, FileDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { ButtonGroup } from "@dafne/frontend-ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dafne/frontend-ui/components/dropdown-menu";
import type { Language } from "@dafne/contracts";
import { documentPdfHref } from "../links.ts";

/** A template a record's PDF can be made with. */
export interface PdfTemplate {
  id: number;
  name: string;
  isDefault: boolean;
  language: Language;
}

/**
 * Opens the PDF of a record in a new tab: with the default template in the
 * record's language (the backend picks it, e.g. by the customer's
 * language), or (from the menu) with one of `templates`.
 */
export function DocumentPdfMenu({
  resource,
  id,
  templates,
}: {
  resource: string;
  id: string | number;
  templates: PdfTemplate[];
}) {
  const t = useTranslations("documents");
  // Without a default the backend has nothing to pick: the button opens the first template.
  const main = templates.some((template) => template.isDefault) ? undefined : templates[0];
  const link = (template?: PdfTemplate) => (
    <a href={documentPdfHref(resource, id, template?.id)} target="_blank" rel="noopener" />
  );

  const button = (
    <Button variant="outline" size="sm" nativeButton={false} render={link(main)}>
      <FileDownIcon data-icon="inline-start" />
      {t("pdf")}
    </Button>
  );
  if (templates.length < 2) {
    return button;
  }
  return (
    <ButtonGroup>
      {button}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label={t("choose")} />}>
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {templates.map((template) => (
            <DropdownMenuItem key={template.id} render={link(template)}>
              {template.name}
              <span className="text-muted-foreground ml-auto text-xs">
                {t(`languages.${template.language}`)}
                {template.isDefault && ` · ${t("defaultTemplate")}`}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
