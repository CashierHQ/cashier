import type { Asset as BackendAsset } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { rsMatch } from "$lib/rsMatch";

export class Asset {
  constructor(public address: Principal) {}

  static fromBackendType(asset: BackendAsset): Asset {
    return rsMatch(asset, {
      IC: (data) => {
        return new Asset(data.address);
      },
    });
  }
}

export default Asset;
