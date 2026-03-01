import type { AddAssetItem } from "$modules/creationLink/types/genericCreationLinkStore";

export type AddAssetVM = {
  assets: AddAssetItem[];
  maxUse: number;

  setAssets: (assets: AddAssetItem[]) => void;
  setFirstAsset: (asset: AddAssetItem) => void;
  setFirstAssetUseAmount: (useAmount: bigint) => void;

  setMaxUse: (value: number) => void;
  increaseMaxUse: () => void;
  decreaseMaxUse: () => void;
};
