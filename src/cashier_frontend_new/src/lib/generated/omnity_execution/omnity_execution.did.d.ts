import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import type { Principal } from "@dfinity/principal";

export interface Account {
  owner: Principal;
  subaccount: [] | [Uint8Array | number[]];
}
export interface Chain {
  fee_token: [] | [string];
  canister_id: string;
  chain_id: string;
  counterparties: [] | [Array<string>];
  chain_state: ChainState;
  chain_type: ChainType;
  contract_address: [] | [string];
}
export type ChainState = { Active: null } | { Deactive: null };
export type ChainType = { SettlementChain: null } | { ExecutionChain: null };
export type ChangeFeeCollector = { SetTo: Account } | { Unset: null };
export interface ConsentInfo {
  metadata: ConsentMessageMetadata;
  consent_message: ConsentMessage;
}
export type ConsentMessage =
  | {
      LineDisplayMessage: { pages: Array<LineDisplayPage> };
    }
  | { GenericDisplayMessage: string };
export interface ConsentMessageMetadata {
  utc_offset_minutes: [] | [number];
  language: string;
}
export interface ConsentMessageRequest {
  arg: Uint8Array | number[];
  method: string;
  user_preferences: ConsentMessageSpec;
}
export interface ConsentMessageSpec {
  metadata: ConsentMessageMetadata;
  device_spec: [] | [DisplayMessageType];
}
export type DisplayMessageType =
  | { GenericDisplay: null }
  | {
      LineDisplay: {
        characters_per_line: number;
        lines_per_page: number;
      };
    };
export interface ErrorInfo {
  description: string;
}
export interface FeatureFlags {
  icrc2: boolean;
}
export type GenerateTicketError =
  | {
      InsufficientRedeemFee: { provided: bigint; required: bigint };
    }
  | { SendTicketErr: string }
  | { TemporarilyUnavailable: string }
  | { TokenNotFound: string }
  | { InsufficientAllowance: { allowance: bigint } }
  | { TransferFailure: string }
  | { UnsupportedAction: string }
  | { RedeemFeeNotSet: null }
  | { InvalidTicketAmount: bigint }
  | { InvalidTicketReceiver: { receiver: string; reason: string } }
  | { UnsupportedChainId: string }
  | { UnsupportedToken: string }
  | { InsufficientFunds: { balance: bigint; ledger_id: Principal } };
export interface GenerateTicketOk {
  ticket_id: string;
}
export interface GenerateTicketReq {
  action: TxAction;
  token_id: string;
  from_subaccount: [] | [Uint8Array | number[]];
  target_chain_id: string;
  amount: bigint;
  receiver: string;
}
export type IcpChainKeyToken = { CKBTC: null };
export interface InitArgs {
  hub_principal: Principal;
  chain_id: string;
  chain_state: ChainState;
}
export interface LineDisplayPage {
  lines: Array<string>;
}
export type MetadataValue =
  | { Int: bigint }
  | { Nat: bigint }
  | { Blob: Uint8Array | number[] }
  | { Text: string };
export type MintTokenStatus =
  | { Finalized: { block_index: bigint } }
  | { Unknown: null };
export type Result = { Ok: null } | { Err: string };
export type Result_1 = { Ok: GenerateTicketOk } | { Err: GenerateTicketError };
export type Result_2 = { Ok: ConsentInfo } | { Err: ErrorInfo };
export type RouteArg = { Upgrade: [] | [UpgradeArgs_1] } | { Init: InitArgs };
export interface RouteState {
  hub_principal: Principal;
  is_timer_running: boolean;
  next_directive_seq: bigint;
  finalized_mint_token_requests: Array<[string, bigint]>;
  token_ledgers: Array<[string, Principal]>;
  chain_id: string;
  tokens: Array<[string, Token]>;
  target_chain_factor: Array<[string, bigint]>;
  counterparties: Array<[string, Chain]>;
  next_ticket_seq: bigint;
  chain_state: ChainState;
  failed_tickets: Array<Ticket>;
  fee_token_factor: [] | [bigint];
}
export interface Ticket {
  token: string;
  action: TxAction;
  dst_chain: string;
  memo: [] | [Uint8Array | number[]];
  ticket_id: string;
  sender: [] | [string];
  ticket_time: bigint;
  ticket_type: TicketType;
  src_chain: string;
  amount: string;
  receiver: string;
}
export type TicketType = { Resubmit: null } | { Normal: null };
export interface Token {
  decimals: number;
  token_id: string;
  metadata: Array<[string, string]>;
  icon: [] | [string];
  name: string;
  symbol: string;
}
export interface TokenResp {
  principal: [] | [Principal];
  decimals: number;
  token_id: string;
  icon: [] | [string];
  rune_id: [] | [string];
  symbol: string;
}
export type TxAction =
  | { Burn: null }
  | { Redeem: null }
  | { Mint: null }
  | { RedeemIcpChainKeyAssets: IcpChainKeyToken }
  | { Merge: Array<string> }
  | { Transfer: null };
export interface UpgradeArgs {
  token_symbol: [] | [string];
  transfer_fee: [] | [bigint];
  metadata: [] | [Array<[string, MetadataValue]>];
  maximum_number_of_accounts: [] | [bigint];
  accounts_overflow_trim_quantity: [] | [bigint];
  change_fee_collector: [] | [ChangeFeeCollector];
  max_memo_length: [] | [number];
  token_name: [] | [string];
  feature_flags: [] | [FeatureFlags];
}
export interface UpgradeArgs_1 {
  hub_principal: [] | [Principal];
  chain_id: [] | [string];
  chain_state: [] | [ChainState];
}
export interface _SERVICE {
  add_controller: ActorMethod<[Principal, Principal], Result>;
  collect_ledger_fee: ActorMethod<[Principal, [] | [bigint], Account], Result>;
  generate_ticket: ActorMethod<[GenerateTicketReq], Result_1>;
  generate_ticket_v2: ActorMethod<[GenerateTicketReq], Result_1>;
  get_chain_list: ActorMethod<[], Array<Chain>>;
  get_fee_account: ActorMethod<[[] | [Principal]], Uint8Array | number[]>;
  get_readable_fee_account: ActorMethod<[[] | [Principal]], string>;
  get_redeem_fee: ActorMethod<[string], [] | [bigint]>;
  get_route_state: ActorMethod<[], RouteState>;
  get_token_ledger: ActorMethod<[string], [] | [Principal]>;
  get_token_list: ActorMethod<[], Array<TokenResp>>;
  icrc21_canister_call_consent_message: ActorMethod<
    [ConsentMessageRequest],
    Result_2
  >;
  mint_token_status: ActorMethod<[string], MintTokenStatus>;
  query_failed_tickets: ActorMethod<[], Array<Ticket>>;
  remove_controller: ActorMethod<[Principal, Principal], Result>;
  resend_ticket: ActorMethod<[string], Result>;
  set_next_directive_seq: ActorMethod<[bigint], undefined>;
  update_icrc_ledger: ActorMethod<[Principal, UpgradeArgs], Result>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
