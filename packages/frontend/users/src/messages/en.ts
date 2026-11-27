/**
 * User texts in English. The source of truth: it.ts must have the same
 * keys (UsersMessages), and the apps merge them under `users`.
 */
export const en = {
  adminsOnly: "Only admins can create users.",
  all: "All users",
  create: "Create user",
  empty: {
    filtered: "No user where {filter}.",
    none: "Nobody has signed up yet.",
    title: "No users found",
  },
  fields: {
    accounts: "Accounts",
    banExpires: "Ban expires",
    banReason: "Ban reason",
    createdAt: "Joined",
    email: "Email",
    emailVerified: "Email verified",
    firstname: "First name",
    groups: "Groups",
    id: "User ID",
    lastActive: "Last active",
    lastname: "Last name",
    name: "Name",
    password: "Password",
    role: "Role",
    status: "Status",
  },
  linked: "Linked",
  listDescription: "Everyone with an account. Filter by a field, or click a column to sort.",
  never: "Never",
  new: "New user",
  newDescription: "The user gets an email with a verification link, and can sign in once they click it.",
  none: "None",
  notAllowed: {
    create: "You need the admin role to create users.",
    detail: "You need the admin role to see user details.",
    list: "You need the admin role to see the list of users.",
    title: "Admins only",
  },
  notVerified: "Not verified",
  noun: "users",
  passwordHint: "The user signs in with this password once they verify their email: share it with them securely.",
  providers: {
    credential: "Email and password",
  },
  role: {
    admin: "Admin",
    "super-admin": "Super-admin",
    user: "User",
  },
  sections: {
    access: "Access",
    details: "Details",
    password: "Password",
    profile: "Profile",
    sessions: "Active sessions ({count})",
    signInMethods: "Sign-in methods",
  },
  sessions: {
    browserOn: "{browser} on {os}",
    device: "Device",
    expires: "Expires",
    impersonated: "Impersonated",
    ip: "IP address",
    lastActive: "Last active",
    none: "No active sessions.",
    signedIn: "Signed in",
    unknownDevice: "Unknown device",
  },
  singular: "User",
  status: {
    active: "Active",
    banned: "Banned",
  },
  title: "Users",
  verified: "Verified",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UsersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "users.fields.email". */
export type UsersMessageKey = `users.${Paths<UsersMessages>}`;
