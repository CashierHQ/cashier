import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { Principal } from "@icp-sdk/core/principal";

export interface AddDestChainArgs { 'dest_chain' : string, 'token_id' : string }
export interface AddRunesTokenReq {
  'dest_chain' : string,
  'icon' : string,
  'rune_id' : string,
  'symbol' : string,
}
export type AddressCheckError = { 'Unsupported' : string } |
  { 'FormatErr' : null };
export type AddressType = { 'Evm' : null } |
  { 'Icp' : null } |
  { 'Ton' : null } |
  { 'Doge' : null } |
  { 'Solana' : null } |
  { 'Bitcoin' : null };
export interface AdminFlowLimitKeyParam {
  'value' : [] | [bigint],
  'update' : boolean,
  'flow_limit_key' : FlowLimitKey,
}
export interface Chain {
  'fee_token' : [] | [string],
  'canister_id' : string,
  'chain_id' : string,
  'counterparties' : [] | [Array<string>],
  'chain_state' : ChainState,
  'chain_type' : ChainType,
  'contract_address' : [] | [string],
}
export interface ChainMeta {
  'fee_token' : [] | [string],
  'canister_id' : string,
  'chain_id' : string,
  'counterparties' : [] | [Array<string>],
  'chain_state' : ChainState,
  'chain_type' : ChainType,
  'contract_address' : [] | [string],
}
export type ChainState = { 'Active' : null } |
  { 'Deactive' : null };
export type ChainType = { 'SettlementChain' : null } |
  { 'ExecutionChain' : null };
export type Directive = { 'UpdateChain' : Chain } |
  { 'UpdateFee' : Factor } |
  { 'AddToken' : Token } |
  { 'AddChain' : Chain } |
  { 'ToggleChainState' : ToggleState } |
  { 'UpdateToken' : Token };
export type Error = { 'AlreadyExistingTicketId' : string } |
  { 'MalformedMessageBytes' : null } |
  { 'NotFoundChain' : string } |
  { 'DeactiveChain' : string } |
  { 'ChainAlreadyExisting' : string } |
  { 'ResubmitTicketIdMustExist' : null } |
  { 'ProposalError' : string } |
  { 'TicketSourceChainUnmatch' : [string, string] } |
  { 'ResubmitTicketMustSame' : null } |
  { 'NotFoundAccountToken' : [string, string, string] } |
  { 'NotFoundTicketId' : string } |
  { 'NotSupportedProposal' : null } |
  { 'SighWithEcdsaError' : string } |
  { 'Unauthorized' : null } |
  { 'TicketAmountParseError' : [string, string] } |
  { 'NotFoundChainToken' : [string, string] } |
  { 'TokenAlreadyExisting' : string } |
  { 'ResubmitTicketSentTooOften' : null } |
  { 'GenerateDirectiveError' : string } |
  { 'EcdsaPublicKeyError' : string } |
  { 'RepeatSubscription' : string } |
  { 'NotFoundToken' : string } |
  { 'CustomError' : string } |
  { 'NotSufficientTokens' : [string, string] };
export type Factor = { 'UpdateFeeTokenFactor' : FeeTokenFactor } |
  { 'UpdateTargetChainFactor' : TargetChainFactor };
export interface FeeTokenFactor {
  'fee_token' : string,
  'fee_token_factor' : bigint,
}
export interface FinalizeAddRunesArgs {
  'name' : string,
  'rune_id' : string,
  'decimal' : number,
}
export interface FlowLimitKey {
  'token_id' : string,
  'dst_chain' : string,
  'src_chain' : string,
}
export interface FlowLimitStatus {
  'flow_limit' : bigint,
  'limit_used' : bigint,
}
export type HubArg = { 'Upgrade' : [] | [UpgradeArgs] } |
  { 'Init' : InitArgs };
export type IcpChainKeyToken = { 'CKBTC' : null };
export interface InitArgs { 'admin' : Principal }
export interface LinkChainReq { 'chain1' : string, 'chain2' : string }
export type Proposal = { 'UpdateChain' : Chain } |
  { 'UpdateFee' : Factor } |
  { 'AddToken' : TokenMeta } |
  { 'AddChain' : Chain } |
  { 'ToggleChainState' : ToggleState } |
  { 'UpdateToken' : TokenMeta };
export type Result = { 'Ok' : null } |
  { 'Err' : SelfServiceError };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : Error };
export type Result_10 = { 'Ok' : Array<[string, Ticket]> } |
  { 'Err' : Error };
export type Result_11 = { 'Ok' : Array<TokenMeta> } |
  { 'Err' : Error };
export type Result_12 = { 'Ok' : Array<TokenResp> } |
  { 'Err' : Error };
export type Result_13 = { 'Ok' : Ticket } |
  { 'Err' : Error };
export type Result_14 = { 'Ok' : Array<[string, string]> } |
  { 'Err' : Error };
export type Result_15 = { 'Ok' : Array<Ticket> } |
  { 'Err' : Error };
export type Result_16 = { 'Ok' : Array<[bigint, Directive]> } |
  { 'Err' : Error };
export type Result_17 = { 'Ok' : Array<[Topic, Subscribers]> } |
  { 'Err' : Error };
export type Result_18 = { 'Ok' : Array<[bigint, Ticket]> } |
  { 'Err' : Error };
export type Result_19 = { 'Ok' : string } |
  { 'Err' : Error };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : AddressCheckError };
export type Result_20 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_21 = { 'Ok' : Array<string> } |
  { 'Err' : Error };
export type Result_3 = { 'Ok' : Chain } |
  { 'Err' : Error };
export type Result_4 = { 'Ok' : Array<Chain> } |
  { 'Err' : Error };
export type Result_5 = { 'Ok' : bigint } |
  { 'Err' : Error };
export type Result_6 = { 'Ok' : Array<TokenOnChain> } |
  { 'Err' : Error };
export type Result_7 = { 'Ok' : Array<Chain> } |
  { 'Err' : Error };
export type Result_8 = { 'Ok' : Array<Directive> } |
  { 'Err' : Error };
export type Result_9 = { 'Ok' : Array<[string, string, bigint]> } |
  { 'Err' : Error };
export type SelfServiceError = { 'TemporarilyUnavailable' : string } |
  { 'InsufficientFee' : { 'provided' : bigint, 'required' : bigint } } |
  { 'TokenNotFound' : null } |
  { 'TopUpFailed' : string } |
  { 'ChainsAlreadyLinked' : null } |
  { 'TransferFailure' : string } |
  { 'InvalidProposal' : string } |
  { 'InvalidRuneId' : string } |
  { 'RequestNotFound' : null } |
  { 'DstChainUnsupported' : null } |
  { 'ChainNotFound' : string } |
  { 'TokenAlreadyExisting' : null } |
  { 'LinkError' : Error } |
  { 'EmptyArgument' : null };
export interface SelfServiceFee {
  'add_token_fee' : bigint,
  'add_chain_fee' : bigint,
}
export interface SetTxFeePerVbyteArgs {
  'low' : bigint,
  'high' : bigint,
  'medium' : bigint,
}
export interface Subscribers { 'subs' : Array<string> }
export interface TargetChainFactor {
  'target_chain_id' : string,
  'target_chain_factor' : bigint,
}
export interface Ticket {
  'token' : string,
  'action' : TxAction,
  'dst_chain' : string,
  'memo' : [] | [Uint8Array | number[]],
  'ticket_id' : string,
  'sender' : [] | [string],
  'ticket_time' : bigint,
  'ticket_type' : TicketType,
  'src_chain' : string,
  'amount' : string,
  'receiver' : string,
}
export type TicketType = { 'Resubmit' : null } |
  { 'Normal' : null };
export type ToggleAction = { 'Deactivate' : null } |
  { 'Activate' : null };
export interface ToggleState { 'action' : ToggleAction, 'chain_id' : string }
export interface Token {
  'decimals' : number,
  'token_id' : string,
  'metadata' : Array<[string, string]>,
  'icon' : [] | [string],
  'name' : string,
  'symbol' : string,
}
export interface TokenMeta {
  'decimals' : number,
  'token_id' : string,
  'metadata' : Array<[string, string]>,
  'icon' : [] | [string],
  'name' : string,
  'issue_chain' : string,
  'symbol' : string,
  'dst_chains' : Array<string>,
}
export interface TokenOnChain {
  'token_id' : string,
  'chain_id' : string,
  'amount' : bigint,
}
export interface TokenResp {
  'decimals' : number,
  'token_id' : string,
  'icon' : [] | [string],
  'name' : string,
  'rune_id' : [] | [string],
  'symbol' : string,
}
export type Topic = { 'UpdateChain' : null } |
  { 'UpdateFee' : null } |
  { 'AddToken' : null } |
  { 'AddChain' : null } |
  { 'ToggleChainState' : null } |
  { 'UpdateToken' : null };
export type TxAction = { 'Burn' : null } |
  { 'Redeem' : null } |
  { 'Mint' : null } |
  { 'RedeemIcpChainKeyAssets' : IcpChainKeyToken } |
  { 'Merge' : Array<string> } |
  { 'Transfer' : null };
export interface UpgradeArgs { 'admin' : [] | [Principal] }
export interface _SERVICE {
  'add_dest_chain_for_token' : ActorMethod<[AddDestChainArgs], Result>,
  'add_runes_token' : ActorMethod<[AddRunesTokenReq], Result>,
  'admin_address_type' : ActorMethod<[string, AddressType], undefined>,
  'admin_flow_limit' : ActorMethod<[Array<AdminFlowLimitKeyParam>], undefined>,
  'audit_stop' : ActorMethod<[], undefined>,
  'batch_update_tx_hash' : ActorMethod<[Array<string>, string], Result_1>,
  'check_address' : ActorMethod<[string, string], Result_2>,
  'controller_add_dest_chain_for_token' : ActorMethod<
    [AddDestChainArgs],
    Result
  >,
  'cycle_balance' : ActorMethod<[], bigint>,
  'etching_add_token' : ActorMethod<[Array<Proposal>], Result_1>,
  'execute_proposal' : ActorMethod<[Array<Proposal>], Result_1>,
  'finalize_add_runes_token_req' : ActorMethod<[FinalizeAddRunesArgs], Result>,
  'finalize_ticket' : ActorMethod<[string], Result_1>,
  'flow_limit' : ActorMethod<[FlowLimitKey], FlowLimitStatus>,
  'get_add_runes_token_requests' : ActorMethod<[], Array<AddRunesTokenReq>>,
  'get_chain' : ActorMethod<[string], Result_3>,
  'get_chain_metas' : ActorMethod<[bigint, bigint], Result_4>,
  'get_chain_size' : ActorMethod<[], Result_5>,
  'get_chain_tokens' : ActorMethod<
    [[] | [string], [] | [string], bigint, bigint],
    Result_6
  >,
  'get_chains' : ActorMethod<
    [[] | [ChainType], [] | [ChainState], bigint, bigint],
    Result_7
  >,
  'get_directive_size' : ActorMethod<[], Result_5>,
  'get_directives' : ActorMethod<[bigint, bigint], Result_8>,
  'get_fee_account' : ActorMethod<[[] | [Principal]], Uint8Array | number[]>,
  'get_fees' : ActorMethod<
    [[] | [string], [] | [string], bigint, bigint],
    Result_9
  >,
  'get_pending_ticket_size' : ActorMethod<[], Result_5>,
  'get_pending_tickets' : ActorMethod<[bigint, bigint], Result_10>,
  'get_runes_oracles' : ActorMethod<[], Array<Principal>>,
  'get_self_service_fee' : ActorMethod<[], SelfServiceFee>,
  'get_token_metas' : ActorMethod<[bigint, bigint], Result_11>,
  'get_token_position_size' : ActorMethod<[], Result_5>,
  'get_token_size' : ActorMethod<[], Result_5>,
  'get_tokens' : ActorMethod<
    [[] | [string], [] | [string], bigint, bigint],
    Result_12
  >,
  'get_total_tx' : ActorMethod<[], Result_5>,
  'get_tx' : ActorMethod<[string], Result_13>,
  'get_tx_hash_size' : ActorMethod<[], Result_5>,
  'get_tx_hashes' : ActorMethod<[bigint, bigint], Result_14>,
  'get_txs' : ActorMethod<[bigint, bigint], Result_15>,
  'get_txs_with_account' : ActorMethod<
    [
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [[bigint, bigint]],
      bigint,
      bigint,
    ],
    Result_15
  >,
  'get_txs_with_chain' : ActorMethod<
    [
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [[bigint, bigint]],
      bigint,
      bigint,
    ],
    Result_15
  >,
  'handle_chain' : ActorMethod<[Array<Proposal>], Result_1>,
  'handle_token' : ActorMethod<[Array<Proposal>], Result_1>,
  'link_chains' : ActorMethod<[LinkChainReq], Result>,
  'paused' : ActorMethod<[], boolean>,
  'pending_ticket' : ActorMethod<[Ticket], Result_1>,
  'query_directives' : ActorMethod<
    [[] | [string], [] | [Topic], bigint, bigint],
    Result_16
  >,
  'query_subscribers' : ActorMethod<[[] | [Topic]], Result_17>,
  'query_tickets' : ActorMethod<[[] | [string], bigint, bigint], Result_18>,
  'query_tx_hash' : ActorMethod<[string], Result_19>,
  'recover_hub' : ActorMethod<[], undefined>,
  'refund_ticket' : ActorMethod<[string, string], Result_1>,
  'remove_runes_oracle' : ActorMethod<[Principal], undefined>,
  'resubmit_ticket' : ActorMethod<[string], undefined>,
  'send_ticket' : ActorMethod<[Ticket], Result_1>,
  'set_audit_programer' : ActorMethod<[Principal], undefined>,
  'set_runes_oracle' : ActorMethod<[Principal], undefined>,
  'set_tx_fee_per_vbyte' : ActorMethod<[SetTxFeePerVbyteArgs], Result_20>,
  'sub_directives' : ActorMethod<[[] | [string], Array<Topic>], Result_1>,
  'sync_ticket_size' : ActorMethod<[], Result_5>,
  'sync_tickets' : ActorMethod<[bigint, bigint], Result_18>,
  'unsub_directives' : ActorMethod<[[] | [string], Array<Topic>], Result_1>,
  'update_fee' : ActorMethod<[Array<Factor>], Result_1>,
  'update_token_max_supply' : ActorMethod<[Array<[string, bigint]>], undefined>,
  'update_tx_hash' : ActorMethod<[string, string], Result_1>,
  'validate_proposal' : ActorMethod<[Array<Proposal>], Result_21>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];