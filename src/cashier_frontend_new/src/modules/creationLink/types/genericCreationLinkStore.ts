import Action from "$modules/links/types/action/action";
import { type LinkTypeValue } from "$modules/links/types/link/linkType";
import type { LinkStep } from "$modules/links/types/linkStep";
import type { AssetInfo as SharedAssetInfo, TokenStandard } from "$shared";
import { Principal } from "@dfinity/principal";

export type AddAssetItem = {
  address: string;
  networkFee?: bigint;
  tokenStandard?: TokenStandard;
  useAmount: bigint;
};

export type CreateLinkData = {
  title: string;
  linkType: LinkTypeValue;
  assets: AddAssetItem[];
  maxUse: number;
};

export type GenericCreationLinkStore = {
  id: string | undefined;
  backendId: string | undefined;
  step: LinkStep;
  linkType: LinkTypeValue;
  createLinkData: CreateLinkData;
  action: Action | undefined;
  setLinkType: (type: LinkTypeValue) => void;
  goNext: () => Promise<void>;
  goBack: () => Promise<void>;
};

export class AddAssetItemMapper {
  static fromSharedAssetInfo(assetInfo: SharedAssetInfo): AddAssetItem {
    return {
      address: assetInfo.asset.address.toText(),
      useAmount: assetInfo.amount,
    };
  }

  static toSharedAssetInfo(asset: AddAssetItem): SharedAssetInfo {
    return {
      asset: {
        address: Principal.fromText(asset.address),
        network_fee: asset.networkFee,
        token_standard: asset.tokenStandard,
      },
      amount: asset.useAmount,
      label: asset.address,
    };
  }
}
