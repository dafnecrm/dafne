/**
 * Customer texts in English. The source of truth: it.ts must have the same
 * keys (CustomersMessages), and the apps merge them under `customers`.
 */
export const en = {
  title: "Activities",
  singular: "Activity",
  new: "New activity",
  all: "All activities",
  noun: "activities",
  create: "Create activity",
  editMeta: "Edit activity",
  newDescription: "Only the name is required.",
  editDescription: "Saving replaces the activity's details.",
  empty: {
    title: "No activities found",
    filtered: "No activity where {filter}.",
    none: "Add your first activity to get started."
  },
  deleteDescription: "The activity will no longer be listed or editable.",
  notFound: "This activity no longer exists.",
  reopen: "Reopen",
  reopenTitle: "Reopen {name}?",
  reopenDescription: "The activity will be open and editable again.",
  close: "Close",
  closeTitle: "Close {name}?",
  closeDescription: "The activity will no longer be editable.",
  sections: {
    details: "Details"
  },
  fields: {
    name: "Name",
    type: "Type",
    status: "Status",
    dueDate: "Due date",
    notes: "Notes",
    completedAt: "Completed at",
    completedBy: "Completed by",
    createdAt: "Added",
    id: "Activity ID"
  },
  type: {
    call: "Call",
    email: "Email",
    meeting: "Meeting",
    task: "Task"
  },
  status: {
    open: "Open",
    closed: "Closed"
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
