import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { walletStore } from "$modules/token/state/walletStore.svelte";

/**
 * Get token logo URL based on token address
 * If image is cached in walletStore, returns cached data URL
 * Otherwise returns original URL
 * @param address - Token address (canister ID)
 * @param skipStore - If true, skip checking store and always return original URL (default: false)
 * @returns URL to the token logo image (data URL if cached, otherwise original URL)
 */
export function getTokenLogo(
  address: string,
  skipStore: boolean = false,
): string {
  if (address === ICP_LEDGER_CANISTER_ID) {
    return "/icpLogo.png";
  }

  // If skipStore is true, always return original URL (for TokenRewardDisplay)
  if (skipStore) {
    return `https://api.icexplorer.io/images/${address}`;
  }

  // Try to get cached image from walletStore
  const cachedImage = walletStore.getTokenImage(address);
  if (cachedImage) {
    return cachedImage;
  }

  // Fallback to original URL if not cached
  return `https://api.icexplorer.io/images/${address}`;
}
