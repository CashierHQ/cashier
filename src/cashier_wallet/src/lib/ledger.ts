import { HttpAgent, Actor } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'
import { getIdentity } from './identity-manager'

const IC_HOST = 'https://icp-api.io'

// Minimal ICRC-1 IDL for transfer + balance
const Account = IDL.Record({
  owner: IDL.Principal,
  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
})

const TransferArg = IDL.Record({
  to: Account,
  fee: IDL.Opt(IDL.Nat),
  memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
  from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  created_at_time: IDL.Opt(IDL.Nat64),
  amount: IDL.Nat
})

const TransferError = IDL.Variant({
  BadFee: IDL.Record({ expected_fee: IDL.Nat }),
  BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
  InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  TooOld: IDL.Null,
  CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
  Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
  TemporarilyUnavailable: IDL.Null,
  GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
})

const TransferResult = IDL.Variant({
  Ok: IDL.Nat,
  Err: TransferError
})

const icrc1IDL: IDL.InterfaceFactory = ({ IDL: idl }) => {
  return idl.Service({
    icrc1_transfer: idl.Func([TransferArg], [TransferResult], []),
    icrc1_balance_of: idl.Func([Account], [idl.Nat], ['query'])
  })
}

/**
 * Create an ICRC-1 actor for the given canister, authenticated with the current identity.
 * @param canisterId - Textual canister ID of the ICRC-1 token ledger.
 * @returns A typed actor ready to call `icrc1_transfer` and `icrc1_balance_of`.
 * @throws {Error} When no authenticated identity is available.
 */
function createActor(canisterId: string) {
  const identity = getIdentity()
  if (!identity) throw new Error('No authenticated identity')

  const agent = HttpAgent.createSync({ identity, host: IC_HOST })

  return Actor.createActor(icrc1IDL, { agent, canisterId })
}

export interface TransferParams {
  /** Textual canister ID of the ICRC-1 token ledger. */
  canisterId: string
  /** Recipient principal in textual form. */
  to: string
  /** Transfer amount in the smallest token unit (e.g. e8s for ICP). */
  amount: bigint
}

/**
 * Submit an ICRC-1 token transfer on-chain using the current authenticated identity.
 * @param params - Transfer details including canister, recipient, and amount.
 * @returns `{ blockIndex }` on success, or `{ error }` describing the ledger rejection.
 */
export async function icrc1Transfer(params: TransferParams): Promise<{ blockIndex?: string; error?: string }> {
  const actor = createActor(params.canisterId)

  const result = await actor.icrc1_transfer({
    to: { owner: Principal.fromText(params.to), subaccount: [] },
    amount: params.amount,
    fee: [],
    memo: [],
    from_subaccount: [],
    created_at_time: []
  }) as { Ok?: bigint; Err?: Record<string, unknown> }

  if ('Ok' in result) {
    return { blockIndex: result.Ok!.toString() }
  }

  // Format the error variant (use replacer to handle BigInt in error details)
  const errKey = Object.keys(result.Err ?? result)[0]
  const details = JSON.stringify(result.Err ?? result, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  )
  return { error: `TransferError::${errKey}: ${details}` }
}

/**
 * Query the ICRC-1 token balance for an account.
 * @param canisterId - Textual canister ID of the ICRC-1 token ledger.
 * @param owner - Principal text of the account to query.
 * @returns Balance in the smallest token unit.
 */
export async function icrc1BalanceOf(canisterId: string, owner: string): Promise<bigint> {
  const actor = createActor(canisterId)
  const balance = await actor.icrc1_balance_of({
    owner: Principal.fromText(owner),
    subaccount: []
  }) as bigint
  return balance
}
