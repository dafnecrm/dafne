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
import { documentPdfHref } from "@/lib/document-links";

/** A template a record's PDF can be made with. */
export interface PdfTemplate {
  id: number;
  name: string;
  isDefault: boolean;
}

/**
 * Opens the PDF of a record in a new tab: with the default template, or
 * (from the menu) with another of `templates`.
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
  const main = templates.find((template) => template.isDefault) ?? templates[0];
  const others = templates.filter((template) => template !== main);
  const link = (template: PdfTemplate) => (
    <a
      href={documentPdfHref(resource, id, template.isDefault ? undefined : template.id)}
      target="_blank"
      rel="noopener"
    />
  );

  const button = (
    <Button variant="outline" size="sm" nativeButton={false} render={link(main)}>
      <FileDownIcon data-icon="inline-start" />
      {t("pdf")}
    </Button>
  );
  if (!others.length) {
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
              {template.isDefault && <span className="text-muted-foreground ml-auto text-xs">{t("defaultTemplate")}</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
