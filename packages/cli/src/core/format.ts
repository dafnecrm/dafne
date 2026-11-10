import * as prettier from 'prettier';

/**
 * Formats with Prettier and the target package's own config (the backend's
 * .prettierrc; Prettier's defaults in the frontend, which match its style).
 * A file that wasn't Prettier-formatted before is left as edited, so the
 * diff only shows what the CLI added.
 */
export async function formatSource(
  path: string,
  source: string,
  original?: string,
  /** The config to use instead of the one on disk (e.g. a .prettierrc created in the same run). */
  config?: prettier.Options,
): Promise<string> {
  const info = await prettier.getFileInfo(path);
  if (info.ignored || !info.inferredParser) {
    return source;
  }
  // JSON config files keep their own layout.
  if (info.inferredParser.startsWith('json')) {
    return source;
  }
  const options = {
    ...(config ?? (await prettier.resolveConfig(path))),
    filepath: path,
  };
  if (original !== undefined && !(await prettier.check(original, options))) {
    return source;
  }
  try {
    return await prettier.format(source, options);
  } catch {
    // Leave it unformatted rather than fail the run.
    return source;
  }
}
