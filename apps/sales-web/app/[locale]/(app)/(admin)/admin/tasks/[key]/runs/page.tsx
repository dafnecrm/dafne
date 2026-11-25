import { redirect } from "next/navigation";
import { taskHref, taskKeyOf } from "@dafne/frontend-tasks";

/** The runs are listed on the task's page. */
export default async function TaskRunsPage({ params }: PageProps<"/[locale]/admin/tasks/[key]/runs">) {
  redirect(taskHref(taskKeyOf((await params).key)));
}
