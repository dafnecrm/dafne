"use client";

import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  DeleteAssistantAgentDialog,
  type AssistantAgentRef,
} from "./assistant-agent-dialogs.tsx";

/**
 * Actions of a row of the assistant agents table, in a menu: view (`<path>/<id>`),
 * edit (`<path>/<id>/edit`), delete.
 */
export function AssistantAgentTableActions({
  assistantAgent,
  path,
}: {
  assistantAgent: AssistantAgentRef;
  path: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();
  const href = `${path}/${encodeURIComponent(assistantAgent.id)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.actionsFor", {
                name: `${t("assistantAgents.singular")} ${assistantAgent.id}`,
              })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={href} />}>
            <EyeIcon />
            {t("common.viewDetails")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`${href}/edit`} />}>
            <PencilIcon />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      {deleting && (
        <DeleteAssistantAgentDialog
          assistantAgent={assistantAgent}
          path={path}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
