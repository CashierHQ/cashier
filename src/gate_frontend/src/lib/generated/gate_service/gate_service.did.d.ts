import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";

export interface XProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
}
export interface XTokenExchangeResult {
  access_token: string;
  profile: XProfile;
}
export type GateServiceError =
  | { InvalidKeyType: string }
  | { AuthError: string }
  | { OpenFailed: string }
  | { AddFailed: string }
  | { UnsupportedGateType: string }
  | { NotFound: null }
  | { HashingFailed: string }
  | { Unauthorized: null }
  | { UnsupportedGateKey: string }
  | { RepositoryError: string }
  | { KeyVerificationFailed: string };

export interface _SERVICE {
  exchange_x_token: ActorMethod<
    [string],
    { Ok: XTokenExchangeResult } | { Err: GateServiceError }
  >;
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
