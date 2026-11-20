/**
 * User group texts in English. The source of truth: it.ts must have the
 * same keys (UserGroupsMessages), and the apps merge them under
 * `userGroups`.
 */
export const en = {
  title: "User groups",
  singular: "User group",
  new: "New user group",
  all: "All user groups",
  noun: "user groups",
  create: "Create user group",
  editMeta: "Edit user group",
  newDescription: "A group of users, e.g. who can use an AI agent.",
  editDescription: "Saving replaces the group's details and members.",
  empty: {
    title: "No user groups found",
    filtered: "No user group where {filter}.",
    none: "Add a group, e.g. Commerciali, to open AI agents to its members.",
  },
  deleteDescription: "Its members lose what the group gave them, e.g. its AI agents.",
  notFound: "This user group no longer exists.",
  sections: { details: "Details", members: "Members", permissions: "Permissions" },
  fields: {
    createdAt: "Added",
    id: "Group ID",
    name: "Name",
    description: "Description",
    memberCount: "Members",
    permissions: "Permissions",
    memberIds: "Members",
  },
  permissions: {
    hint: "What its members can do, besides reading. Admins can do everything anyway.",
    subjects: { Customer: "Customers", Activity: "Activities", Product: "Products", Uom: "Units of measure", UomConversion: "Unit conversions", SalesOrder: "Sales orders", Quotation: "Quotations", DocumentTemplate: "Document templates" },
    actions: { create: "Create", update: "Edit", delete: "Delete", close: "Close / reopen", changeStatus: "Change status" },
    selectAll: "Select all",
    selectNone: "Select none",
  },
  allUsers: {
    badge: "All users",
    hint: "This group applies to every user of the app: its permissions are everyone's.",
  },
  members: {
    search: "Search users by name or email",
    none: "No members yet",
    empty: "No users found",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UserGroupsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "userGroups.fields.id". */
export type UserGroupsMessageKey = `userGroups.${Paths<UserGroupsMessages>}`;
