/**
 * User texts in English. The source of truth: it.ts must have the same
 * keys (UsersMessages), and the apps merge them under `users`.
 */
export const en = {
  title: "Users",
  singular: "User",
  new: "New user",
  all: "All users",
  noun: "users",
  create: "Create user",
  listDescription: "Everyone with an account. Filter by a field, or click a column to sort.",
  newDescription: "The user gets an email with a verification link, and can sign in once they click it.",
  passwordHint: "The user signs in with this password once they verify their email: share it with them securely.",
  adminsOnly: "Only admins can create users.",
  notAllowed: {
    title: "Admins only",
    list: "You need the admin role to see the list of users.",
    create: "You need the admin role to create users.",
    detail: "You need the admin role to see user details.",
  },
  empty: {
    title: "No users found",
    filtered: "No user where {filter}.",
    none: "Nobody has signed up yet.",
  },
  sections: {
    details: "Details",
    password: "Password",
    profile: "Profile",
    access: "Access",
    signInMethods: "Sign-in methods",
    sessions: "Active sessions ({count})",
  },
  fields: {
    name: "Name",
    firstname: "First name",
    lastname: "Last name",
    email: "Email",
    emailVerified: "Email verified",
    role: "Role",
    status: "Status",
    password: "Password",
    banReason: "Ban reason",
    banExpires: "Ban expires",
    lastActive: "Last active",
    accounts: "Accounts",
    createdAt: "Joined",
    id: "User ID",
    groups: "Groups",
  },
  role: {
    admin: "Admin",
    "super-admin": "Super-admin",
    user: "User",
  },
  status: {
    active: "Active",
    banned: "Banned",
  },
  verified: "Verified",
  notVerified: "Not verified",
  never: "Never",
  none: "None",
  linked: "Linked",
  providers: {
    credential: "Email and password",
  },
  sessions: {
    device: "Device",
    ip: "IP address",
    signedIn: "Signed in",
    lastActive: "Last active",
    expires: "Expires",
    impersonated: "Impersonated",
    none: "No active sessions.",
    unknownDevice: "Unknown device",
    browserOn: "{browser} on {os}",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UsersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "users.fields.email". */
export type UsersMessageKey = `users.${Paths<UsersMessages>}`;
