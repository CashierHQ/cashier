import { IC_ROOT_KEY } from "@dfinity/agent";
import type {
  PermissionScope,
  PermissionState,
  SupportedStandard,
} from "@slide-computer/signer";

// TODO: Remove this if all PRs resolve
// - https://github.com/slide-computer/signer-js/pull/9
// - https://github.com/slide-computer/signer-js/pull/10
// - https://github.com/slide-computer/signer-js/pull/11
export const supportedStandards: SupportedStandard[] = [
  {
    name: "ICRC-1",
    url: "https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/README.md",
  },
  {
    name: "ICRC-2",
    url: "https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-2/README.md",
  },
  {
    name: "ICRC-7",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md",
  },
  {
    name: "ICRC-25",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-25/ICRC-25.md",
  },
  {
    name: "ICRC-27",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-27/ICRC-27.md",
  },
  {
    name: "ICRC-34",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-34/ICRC-34.md",
  },
  {
    name: "ICRC-37",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-37/ICRC-37.md",
  },
  {
    name: "ICRC-49",
    url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-49/ICRC-49.md",
  },
  {
    name: "ICRC-112",
    url: "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_112_batch_call_canister.md",
  },
  {
    name: "ICRC-114",
    url: "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_114_validate_batch_call.md",
  },
];

export const scopes: Array<{
  scope: PermissionScope;
  state: PermissionState;
}> = [
  {
    scope: {
      method: "icrc27_accounts",
    },
    state: "granted",
  },
  {
    scope: {
      method: "icrc34_delegation",
    },
    state: "granted",
  },
  {
    scope: {
      method: "icrc49_call_canister",
    },
    state: "granted",
  },
  {
    scope: {
      method: "icrc112_batch_call_canister",
    },
    state: "granted",
  },
];

export const ICRC_114_METHOD_NAME = "icrc114_validate";

export const MAINNET_ROOT_KEY = new Uint8Array(
  IC_ROOT_KEY.match(/[\da-f]{2}/gi)!.map((h) => parseInt(h, 16)),
).buffer;
