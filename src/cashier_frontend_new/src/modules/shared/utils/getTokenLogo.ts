import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";

/**
 * Get token logo URL based on token address
 * @param address - Token address (canister ID)
 * @returns URL to the token logo image
 */
export function getTokenLogo(address: string): string {
  if (address === ICP_LEDGER_CANISTER_ID) {
    return "/icpLogo.png";
  }
  return `https://api.icexplorer.io/images/${address}`;
}
