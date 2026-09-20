export function entryModulePath(html: string, baseUrl: string): string | null {
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  for (const script of scripts) {
    if (!/\btype\s*=\s*["']module["']/i.test(script)) continue;
    const src = script.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    try { return new URL(src, baseUrl).pathname; } catch { return null; }
  }
  return null;
}

export function hasNewEntryBundle(currentModuleUrl: string, latestHtml: string, baseUrl: string): boolean {
  const latest = entryModulePath(latestHtml, baseUrl);
  if (!latest) return false;
  try { return new URL(currentModuleUrl, baseUrl).pathname !== latest; }
  catch { return false; }
}
