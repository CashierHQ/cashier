import type { Principal } from "@icp-sdk/core/principal";

// Frontend representation of a Wallet
class Wallet {
  constructor(
    public address: Principal,
    public subaccount: Uint8Array | number[] | null,
  ) {}
}

export default Wallet;
