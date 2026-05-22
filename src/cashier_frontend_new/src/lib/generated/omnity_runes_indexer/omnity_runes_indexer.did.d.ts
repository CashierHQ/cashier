import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { Principal } from "@icp-sdk/core/principal";

export type BitcoinNetwork = { 'mainnet' : null } |
  { 'regtest' : null } |
  { 'testnet' : null };
export interface Config {
  'bitcoin_rpc_url' : string,
  'network' : BitcoinNetwork,
  'subscribers' : Array<Principal>,
}
export type Error = { 'MaxOutpointsExceeded' : null };
export interface GetEtchingResult {
  'confirmations' : number,
  'rune_id' : string,
}
export type Result = { 'Ok' : Array<[] | [Array<RuneBalance>]> } |
  { 'Err' : Error };
export interface RuneBalance {
  'confirmations' : number,
  'divisibility' : number,
  'amount' : bigint,
  'rune_id' : string,
  'symbol' : [] | [string],
}
export interface RuneEntry {
  'confirmations' : number,
  'mints' : bigint,
  'terms' : [] | [Terms],
  'etching' : string,
  'turbo' : boolean,
  'premine' : bigint,
  'divisibility' : number,
  'spaced_rune' : string,
  'number' : bigint,
  'timestamp' : bigint,
  'block' : bigint,
  'burned' : bigint,
  'rune_id' : string,
  'symbol' : [] | [string],
}
export type RunesIndexerArgs = { 'Upgrade' : [] | [UpgradeArgs] } |
  { 'Init' : Config };
export interface Terms {
  'cap' : [] | [bigint],
  'height' : [[] | [bigint], [] | [bigint]],
  'offset' : [[] | [bigint], [] | [bigint]],
  'amount' : [] | [bigint],
}
export interface UpgradeArgs {
  'bitcoin_rpc_url' : [] | [string],
  'subscribers' : [] | [Array<Principal>],
}
export interface _SERVICE {
  'get_etching' : ActorMethod<[string], [] | [GetEtchingResult]>,
  'get_latest_block' : ActorMethod<[], [number, string]>,
  'get_rune' : ActorMethod<[string], [] | [RuneEntry]>,
  'get_rune_balances_for_outputs' : ActorMethod<[Array<string>], Result>,
  'get_rune_by_id' : ActorMethod<[string], [] | [RuneEntry]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];