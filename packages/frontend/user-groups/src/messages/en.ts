/**
 * User group texts in English. The source of truth: it.ts must have the
 * same keys (UserGroupsMessages), and the apps merge them under
 * `userGroups`.
 */
export const en = {
  all: "All user groups",
  allUsers: {
    badge: "All users",
    hint: "This group applies to every user of the app: its permissions are everyone's.",
  },
  create: "Create user group",
  deleteDescription: "Its members lose what the group gave them, e.g. its AI agents.",
  editDescription: "Saving replaces the group's details and members.",
  editMeta: "Edit user group",
  empty: {
    filtered: "No user group where {filter}.",
    none: "Add a group, e.g. Commerciali, to open AI agents to its members.",
    title: "No user groups found",
  },
  fields: {
    createdAt: "Added",
    description: "Description",
    id: "Group ID",
    memberCount: "Members",
    memberIds: "Members",
    name: "Name",
    permissions: "Permissions",
  },
  members: {
    empty: "No users found",
    none: "No members yet",
    search: "Search users by name or email",
  },
  new: "New user group",
  newDescription: "A group of users, e.g. who can use an AI agent.",
  notFound: "This user group no longer exists.",
  noun: "user groups",
  permissions: {
    actions: { changeStatus: "Change status", close: "Close / reopen", create: "Create", delete: "Delete", update: "Edit" },
    hint: "What its members can do, besides reading. Admins can do everything anyway.",
    selectAll: "Select all",
    selectNone: "Select none",
    subjects: { Activity: "Activities", Customer: "Customers", DocumentTemplate: "Document templates", Product: "Products", Quotation: "Quotations", SalesOrder: "Sales orders", Uom: "Units of measure", UomConversion: "Unit conversions" },
  },
  sections: { details: "Details", members: "Members", permissions: "Permissions" },
  singular: "User group",
  title: "User groups",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UserGroupsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "userGroups.fields.id". */
export type UserGroupsMessageKey = `userGroups.${Paths<UserGroupsMessages>}`;
