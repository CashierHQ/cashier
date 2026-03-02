import { type IcrcStandard as BackendIcrcStandard } from "$lib/generated/token_storage/token_storage.did";
import { rsMatch } from "$lib/rsMatch";
import { TokenStandard as SharedTokenStandard } from "$shared";

export enum TokenStandard {
  ICRC1 = "ICRC-1",
  ICRC2 = "ICRC-2",
  ICRC3 = "ICRC-3",
}

export type TokenStandardValue =
  | typeof TokenStandard.ICRC1
  | typeof TokenStandard.ICRC2
  | typeof TokenStandard.ICRC3;

export class TokenStandardMapper {
  static fromBackendType(b: BackendIcrcStandard): TokenStandardValue {
    return rsMatch(b, {
      ICRC1: () => TokenStandard.ICRC1,
      ICRC2: () => TokenStandard.ICRC2,
      ICRC3: () => TokenStandard.ICRC3,
    });
  }

  static toSharedType(value: TokenStandardValue): SharedTokenStandard {
    switch (value) {
      case TokenStandard.ICRC1:
        return SharedTokenStandard.ICRC1;
      case TokenStandard.ICRC2:
        return SharedTokenStandard.ICRC2;
      default:
        throw new Error(`Unsupported TokenStandardValue: ${value}`);
    }
  }
}
