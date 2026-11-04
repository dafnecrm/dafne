/** The signed-in user, as apps/auth's session returns it. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  /** Global role (Better Auth's admin plugin): "admin" sees every app. */
  role?: string | null;
  firstname: string;
  lastname: string;
  /** The apps the user can use, with their role in each (app_access). */
  apps: Record<string, string>;
}

export interface SessionData {
  id: string;
  userId: string;
  expiresAt: string | Date;
}

/** What `@Session()` gives a controller: the same shape as Better Auth's. */
export interface UserSession {
  user: SessionUser;
  session: SessionData;
}
