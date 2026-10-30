import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  CalendarClockIcon,
  TagIcon,
  LinkIcon,
  TextIcon,
} from "lucide-react";
import Link from "next/link";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import type { TaskDetail } from "@/lib/tasks";
import {
  activityHref,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks-table";
import { TextEditorContent } from "@/components/ui/text-editor";

/** The details of a task: its fields, then who created and updated it. */
export function TaskDetails({ task }: { task: TaskDetail }) {
  return (
    <>
      <DetailSection title="Details">
        <Detail icon={CalendarClockIcon} label="Due date">
          <LocalDate value={task.dueDate} format="dateTime" />
        </Detail>
        <Detail icon={TagIcon} label="Type">
          {TASK_TYPE_OPTIONS.find((o) => o.value === task.type)?.label ?? "—"}
        </Detail>
        <Detail icon={LinkIcon} label="Activity">
          <Link
            href={activityHref(task.activityId)}
            className="underline-offset-4 hover:underline"
          >
            {task.activity?.name}
          </Link>
        </Detail>
        <Detail icon={TextIcon} label="Notes" wide>
          <TextEditorContent html={task.notes} className="font-normal" />
        </Detail>
        <Detail icon={TagIcon} label="Status">
          {TASK_STATUS_OPTIONS.find((o) => o.value === task.status)?.label ??
            "—"}
        </Detail>
      </DetailSection>
      <DetailSection title="Record">
        <Detail icon={FingerprintIcon} label="Task ID">
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{task.id}</code>
            <CopyButton variant="ghost" value={task.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label="Created">
          <LocalDate value={task.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label="Created by">
          {task.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label="Updated">
          <LocalDate value={task.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label="Updated by">
          {task.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
