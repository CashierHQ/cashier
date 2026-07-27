/**
 * Get token logo URL based on token address
 * Checks cache first, then returns original URL if not cached
 */

import {
  CKBTC_CANISTER_ID,
  ICP_LEDGER_CANISTER_ID,
} from "$modules/token/constants";
import { getCachedTokenImage } from "$modules/imageCache/utils/imageCache";

type TokenLogoSource = {
  address: string;
  runeInfo?: {
    icon?: string | null;
  } | null;
};

/**
 * Get token logo URL based on token address
 * If image is cached, returns cached data URL
 * Otherwise returns original URL
 * @param address - Token address (canister ID)
 * @param skipStore - If true, skip checking cache and always return original URL (default: false)
 * @returns URL to the token logo image (data URL if cached, otherwise original URL)
 */
export function getTokenLogo(
  address: string,
  skipStore: boolean = false,
): string {
  if (address === ICP_LEDGER_CANISTER_ID) {
    return "/icpLogo.png";
  } else if (address === CKBTC_CANISTER_ID) {
    return "/btcLogo.png";
  }

  // If skipStore is true, always return original URL (for TokenRewardDisplay)
  if (skipStore) {
    return `https://api.icexplorer.io/images/${address}`;
  }

  // Try to get cached image from cache
  const cachedImage = getCachedTokenImage(address);
  if (cachedImage) {
    return cachedImage;
  }

  // Fallback to original URL if not cached
  return `https://api.icexplorer.io/images/${address}`;
}

/**
 * Normalizes token metadata icon URLs before they are used as image sources.
 *
 * Rune metadata can contain non-URL icon values such as asset IDs. Those values
 * should not be rendered directly because the browser treats them as relative
 * app paths and repeatedly 404s.
 *
 * @param icon - Raw icon value from token metadata.
 * @returns A browser-safe icon URL, or undefined when the value is not a URL.
 */
export function normalizeTokenMetadataIcon(
  icon: string | null | undefined,
): string | undefined {
  const trimmedIcon = icon?.trim();
  if (!trimmedIcon) return undefined;

  if (trimmedIcon.startsWith("//")) {
    return `https:${trimmedIcon}`;
  }

  if (
    /^https?:\/\//i.test(trimmedIcon) ||
    trimmedIcon.startsWith("data:") ||
    trimmedIcon.startsWith("blob:")
  ) {
    return trimmedIcon;
  }

  return undefined;
}

/**
 * Gets the best browser-safe logo URL for a token.
 *
 * @param token - Token metadata with address and optional Rune icon metadata.
 * @param skipStore - If true, skip checking the image cache for the fallback canister logo.
 * @returns A safe token logo URL.
 */
export function getResolvedTokenLogo(
  token: TokenLogoSource,
  skipStore: boolean = false,
): string {
  return (
    normalizeTokenMetadataIcon(token.runeInfo?.icon) ??
    getTokenLogo(token.address, skipStore)
  );
}
