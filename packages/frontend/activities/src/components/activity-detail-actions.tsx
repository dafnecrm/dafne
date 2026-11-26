"use client";

import { useTranslations } from "next-intl";
import { Can } from "@dafne/frontend-permissions";
import {
  CircleCheckIcon,
  EllipsisVerticalIcon,
  HistoryIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";
import type { PERMISSIONS } from "@dafne/contracts";
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
import {
  CloseActivityDialog,
  DeleteActivityDialog,
  ReopenActivityDialog,
  type ActivityRef,
} from "./activity-dialogs";
import { ActivityChangelogSheet } from "./activity-changelog.tsx";
import {
  ACTIVITY_STATUSES_ALLOW_CLOSE,
  ACTIVITY_STATUSES_ALLOW_EDIT,
  ACTIVITY_STATUSES_ALLOW_REOPEN,
} from "../activity-status-options";

/** An action of the page: a button from `sm`, an item of the menu below. */
interface Step {
  key: string;
  label: string;
  icon: React.ComponentType;
  /** The permission it needs, on Activity. */
  can: (typeof PERMISSIONS)["Activity"][number];
  primary?: boolean;
  /** A link (edit), or else what it does. */
  href?: string;
  onSelect?: () => void;
}

/**
 * Actions on the activity's page: edit (open only), close or reopen (in
 * a dialog, through the state machine), then a menu with its history and
 * delete. Below `sm` only the menu is shown, with those actions at its
 * top: each is listed once (`steps`) and rendered both ways, and each
 * dialog once, outside.
 */
export function ActivityDetailActions({ activity }: { activity: ActivityRef }) {
  const [dialog, setDialog] = useState<"reopen" | "close" | "delete">();
  const [history, setHistory] = useState(false);
  const t = useTranslations();
  const href = `/activities/${encodeURIComponent(activity.id)}`;
  const closeDialog = () => setDialog(undefined);

  const steps: Step[] = [];
  if (ACTIVITY_STATUSES_ALLOW_EDIT.includes(activity.status)) {
    steps.push({
      key: "edit",
      label: t("common.edit"),
      icon: PencilIcon,
      can: "update",
      href: `${href}/edit`,
    });
  }
  if (ACTIVITY_STATUSES_ALLOW_REOPEN.includes(activity.status)) {
    steps.push({
      key: "reopen",
      label: t("activities.reopen"),
      icon: RotateCcwIcon,
      can: "changeStatus",
      primary: true,
      onSelect: () => setDialog("reopen"),
    });
  }
  if (ACTIVITY_STATUSES_ALLOW_CLOSE.includes(activity.status)) {
    steps.push({
      key: "close",
      label: t("activities.close"),
      icon: CircleCheckIcon,
      can: "changeStatus",
      primary: true,
      onSelect: () => setDialog("close"),
    });
  }

  return (
    <>
      {steps.map(({ key, label, icon: Icon, can, primary, href, onSelect }) => (
        <Can key={key} I={can} a="Activity">
          <Button
            className="hidden sm:inline-flex"
            variant={primary ? "default" : "outline"}
            size="sm"
            {...(href
              ? { nativeButton: false, render: <Link href={href} /> }
              : { onClick: onSelect })}
          >
            <Icon data-icon="inline-start" />
            {label}
          </Button>
        </Can>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.actionsFor", { name: activity.name })}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            {steps.map(({ key, label, icon: Icon, can, href, onSelect }) => (
              <Can key={key} I={can} a="Activity">
                <DropdownMenuItem
                  className="sm:hidden"
                  {...(href ? { render: <Link href={href} /> } : { onClick: onSelect })}
                >
                  <Icon />
                  {label}
                </DropdownMenuItem>
              </Can>
            ))}
            {steps.length > 0 && <DropdownMenuSeparator className="sm:hidden" />}
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setHistory(true)}>
            <HistoryIcon />
            {t("changelog.open")}
          </DropdownMenuItem>
          <Can I="delete" a="Activity">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialog("delete")}
            >
              <Trash2Icon />
              {t("common.delete")}
            </DropdownMenuItem>
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which closes when an item is clicked. */}
      <ActivityChangelogSheet
        activityId={activity.id}
        open={history}
        onOpenChange={setHistory}
      />
      {dialog === "reopen" && (
        <ReopenActivityDialog activity={activity} onClose={closeDialog} />
      )}
      {dialog === "close" && (
        <CloseActivityDialog activity={activity} onClose={closeDialog} />
      )}
      {dialog === "delete" && (
        <DeleteActivityDialog
          activity={activity}
          then="list"
          onClose={closeDialog}
        />
      )}
    </>
  );
}
