// What drizzle-kit sees of the changelog schema: nothing. Its tables are
// partitioned, which drizzle-kit can't express, so its migrations are
// written by hand (`--custom`, see drizzle.config.ts).
export {};
