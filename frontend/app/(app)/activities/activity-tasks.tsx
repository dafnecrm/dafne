import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityDetail } from "@/lib/activities";
import { TASK_TYPE_OPTIONS } from "@/lib/tasks-table";

/**
 * The tasks of an activity (they come with it), soonest due first, with a
 * button to add one. Tasks have no list of their own: this is where
 * they're found.
 */
export function ActivityTasks({
  activity,
}: {
  activity: Pick<ActivityDetail, "id" | "tasks">;
}) {
  const { tasks } = activity;
  const newHref = `/tasks/new?activityId=${encodeURIComponent(activity.id)}`;

  return (
    <DetailSection title={`Tasks (${tasks.length})`} groupClassName="flex">
      {tasks.length ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link
                      href={`/tasks/${encodeURIComponent(task.id)}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {task.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {TASK_TYPE_OPTIONS.find((o) => o.value === task.type)
                      ?.label ?? "—"}
                  </TableCell>
                  <TableCell>
                    <LocalDate value={task.dueDate} format="dateTime" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      )}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={newHref} />}
        >
          <PlusIcon data-icon="inline-start" />
          Add task
        </Button>
      </div>
    </DetailSection>
  );
}
