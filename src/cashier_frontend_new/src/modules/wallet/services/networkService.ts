import type { TokenWithPriceAndBalance } from "$modules/token/types";

/**
 * Network information
 */
export interface NetworkInfo {
  id: string;
  name: string;
  logoUrl: string;
}

/**
 * Get network information for a token
 * Currently all tokens are on Internet Computer network
 * @param _token - Token to get network info for (currently unused, reserved for future multi-network support)
 * @returns Network information
 */
export function getNetworkForToken(
  _token: TokenWithPriceAndBalance | null,
): NetworkInfo {
  // All tokens in this project are on Internet Computer
  // In the future, this can be extended to support multiple networks based on token
  // For now, _token parameter is kept for API consistency and future extensibility
  void _token; // Explicitly mark as intentionally unused
  return {
    id: "icp",
    name: "Internet Computer",
    logoUrl: "/icpLogo.png",
  };
}

/**
 * Get network name for display
 * @param token - Token to get network name for
 * @returns Network name string
 */
export function getNetworkName(token: TokenWithPriceAndBalance | null): string {
  return getNetworkForToken(token).name;
}

/**
 * Get network logo URL
 * @param token - Token to get network logo for
 * @returns Network logo URL
 */
export function getNetworkLogo(token: TokenWithPriceAndBalance | null): string {
  return getNetworkForToken(token).logoUrl;
}
