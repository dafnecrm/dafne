/**
 * Customer texts in English. The source of truth: it.ts must have the same
 * keys (CustomersMessages), and the apps merge them under `customers`.
 */
export const en = {
  all: "All activities",
  close: "Close",
  closeDescription: "The activity will no longer be editable.",
  closeTitle: "Close {name}?",
  create: "Create activity",
  deleteDescription: "The activity will no longer be listed or editable.",
  editDescription: "Saving replaces the activity's details.",
  editMeta: "Edit activity",
  empty: {
    filtered: "No activity where {filter}.",
    none: "Add your first activity to get started.",
    title: "No activities found"
  },
  fields: {
    completedAt: "Completed at",
    completedBy: "Completed by",
    createdAt: "Added",
    dueDate: "Due date",
    id: "ID",
    name: "Name",
    notes: "Notes",
    status: "Status",
    type: "Type"
  },
  new: "New activity",
  newDescription: "Only the name is required.",
  notFound: "This activity no longer exists.",
  noun: "activities",
  reopen: "Reopen",
  reopenDescription: "The activity will be open and editable again.",
  reopenTitle: "Reopen {name}?",
  sections: {
    details: "Details"
  },
  singular: "Activity",
  status: {
    closed: "Closed",
    open: "Open"
  },
  title: "Activities",
  type: {
    call: "Call",
    email: "Email",
    meeting: "Meeting",
    task: "Task"
  }
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ActivitiesMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "activities.fields.name". */
export type ActivitiesMessageKey = `activities.${Paths<ActivitiesMessages>}`;
