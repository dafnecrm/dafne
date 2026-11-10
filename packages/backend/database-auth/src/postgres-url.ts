/**
 * The DATABASE_URL of an app, checked: node-postgres ignores the URL's
 * scheme, so a leftover mysql:// URL would reach a MySQL server and fail
 * later with "received invalid response".
 */
export function postgresUrl(url: string, name = 'DATABASE_URL'): string {
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      `${name} must be a Postgres URL (postgres://user:pass@host:5432/dafne), not ${url.split(':')[0]}://…`,
    );
  }
  return url;
}
