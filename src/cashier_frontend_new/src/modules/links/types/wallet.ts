import type { Wallet as BackendWallet } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { rsMatch } from "$lib/rsMatch";

export class Wallet {
  constructor(
    public subaccount: Uint8Array | number[] | null,
    public address: Principal,
  ) {}

  static fromBackendType(wallet: BackendWallet): Wallet {
    return rsMatch(wallet, {
      IC: (data) => {
        return new Wallet(
          data.subaccount.length > 0 ? data.subaccount[0]! : null,
          data.address,
        );
      },
    });
  }
}

export default Wallet;
