import type { Wallet as BackendWallet } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of a Wallet
class Wallet {
  constructor(
    public address: Principal,
    public subaccount: Uint8Array | number[] | null,
  ) {}

  /**
   * @param wallet BackendWallet from backend
   * @returns Wallet instance
   */
  static fromBackendType(wallet: BackendWallet): Wallet {
    return rsMatch(wallet, {
      IC: (data) => {
        return new Wallet(
          data.address,
          data.subaccount.length > 0 ? data.subaccount[0]! : null,
        );
      },
    });
  }
}

export default Wallet;
