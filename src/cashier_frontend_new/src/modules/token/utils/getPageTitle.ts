/**
 * Gets the page title for wallet pages based on the path.
 * If a custom header is provided, it takes precedence.
 * @param path The current pathname
 * @param header Optional custom header that overrides the default title
 * @returns The page title string
 */
export function getPageTitle(path: string, header?: string): string {
  if (header) return header;

  if (path === "/wallet/send") return "Send";
  if (path === "/wallet/receive") return "Receive";
  if (path === "/wallet/swap") return "Swap";
  if (path === "/wallet/manage") return "Manage tokens";
  if (path === "/wallet/import") return "Import manually";
  return "";
}
