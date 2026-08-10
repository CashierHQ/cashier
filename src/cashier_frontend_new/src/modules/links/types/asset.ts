import type { Principal } from "@icp-sdk/core/principal";

// Frontend representation of an Asset
class Asset {
  public address: Principal;
  public chain: string = "IC";

  constructor(address: Principal) {
    this.address = address;
  }

  static IC(address: Principal): Asset {
    return new Asset(address);
  }
}

export default Asset;
