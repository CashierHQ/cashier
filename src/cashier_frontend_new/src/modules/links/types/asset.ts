import type { Asset as BackendAsset } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of an Asset
class Asset {
  public address: Principal;
  public chain: string = "IC";

  constructor(address: Principal) {
    this.address = address;
  }

  // Convert from backend Asset to frontend Asset
  static fromBackend(asset: BackendAsset): Asset {
    return rsMatch(asset, {
      IC: (data) => {
        return new Asset(data.address);
      },
    });
  }

  static IC(address: Principal): Asset {
    return new Asset(address);
  }

  toBackend(): BackendAsset {
    if (this.chain !== "IC") {
      throw new Error(`Unsupported asset chain: ${this.chain}`);
    }

    return {
      IC: {
        address: this.address,
      },
    };
  }
}

export default Asset;
