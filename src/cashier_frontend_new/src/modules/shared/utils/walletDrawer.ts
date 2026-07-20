import { WalletViewType } from "$modules/shared/types/wallet";

/**
 * Gets the Tailwind classes for the wallet drawer content wrapper.
 *
 * @param viewType - Wallet drawer view that controls scrolling and spacing.
 * @returns Space-delimited class names for the wallet drawer content wrapper.
 */
export function getWalletContentClass(viewType: WalletViewType): string {
  const classes = ["flex-1", "min-h-0", "flex", "flex-col", "p-4"];

  classes.push(
    viewType === WalletViewType.MANAGE ? "overflow-hidden" : "overflow-y-auto",
  );

  if (viewType === WalletViewType.MAIN) {
    classes.push("pt-10");
  }

  return classes.join(" ");
}
