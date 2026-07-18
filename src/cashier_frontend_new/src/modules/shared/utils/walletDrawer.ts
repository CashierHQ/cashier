import { WalletViewType } from "$modules/shared/types/wallet";

export function getWalletContentClass(viewType: WalletViewType) {
  const classes = ["flex-1", "min-h-0", "flex", "flex-col", "p-4"];

  classes.push(
    viewType === WalletViewType.MANAGE ? "overflow-hidden" : "overflow-y-auto",
  );

  if (viewType === WalletViewType.MAIN) {
    classes.push("pt-10");
  }

  return classes.join(" ");
}
