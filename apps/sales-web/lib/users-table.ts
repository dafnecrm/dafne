import { defineUsersTable } from "@dafne/frontend-users";

/** This app's users table (@dafne/frontend-users), on /admin/users. */
export const usersTable = defineUsersTable({ path: "/admin/users" });
