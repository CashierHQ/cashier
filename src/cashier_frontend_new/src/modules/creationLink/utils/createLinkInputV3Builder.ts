import type { CreateLinkInputV3 } from "$modules/links/types/linkV3";
import type { CreateLinkData } from "$modules/creationLink/types/createLinkData";
import type { Action } from "$shared";
import { LinkType } from "$modules/links/types/link/linkType";
import { Err, Ok, type Result } from "ts-results-es";
import {
  IntentParticipants,
  TokenStandard,
  calculateIntentFees,
} from "$shared";
import { ICP_LEDGER_FEE } from "$modules/token/constants";

function toVariant(value: string): Record<string, null> {
  return { [value]: null } as Record<string, null>;
}

/**
 * Map shared Intent to Candid Intent format for createLinkV3.
 * Backend expects: action_id, user_fee, total_amount, network_fee, dependencies as Opt.
 * For Treasury intents, total_amount and network_fee MUST be set for ICRC2 approve_amount.
 * Candid opt: use [] for None, [value] for Some - agent-js encodes [] | [T] for IDL.Opt.
 */
function toCandidIntent(
  intent: {
    id: string;
    amount: bigint;
    intent_type: string;
    intent_state: string;
    source_address_type: string;
    dest_address_type: string;
    source_address: unknown;
    dest_address: unknown;
    asset: { address: unknown; token_standard?: string };
    user_fee?: bigint;
    total_amount?: bigint;
    network_fee?: bigint;
    dependencies?: string[];
  },
  actionId: string,
): Record<string, unknown> {
  const { user_fee, total_amount, network_fee, dependencies: deps } = intent;

  const asset = intent.asset as { address: unknown; token_standard?: string };
  const assetCandid = {
    address: asset.address,
    token_standard: asset.token_standard ? [{ [asset.token_standard]: null }] : [],
    network_fee: [] as unknown,
  };

  // Candid Opt: IDL.Opt(IDL.Nat). Backend Rust Option<Nat> decodes [] as None, [bigint] as Some.
  const optNat = (v: bigint | undefined): [] | [bigint] =>
    v !== undefined ? [v] : [];

  return {
    id: intent.id,
    action_id: actionId ? [actionId] : [],
    amount: intent.amount,
    intent_type: intent.intent_type === "Receive" ? { Receive: null } : { Send: null },
    intent_state: { [intent.intent_state]: null } as Record<string, null>,
    source_address_type: { [intent.source_address_type]: null } as Record<string, null>,
    dest_address_type: { [intent.dest_address_type]: null } as Record<string, null>,
    source_address: intent.source_address,
    dest_address: intent.dest_address,
    asset: assetCandid,
    user_fee: optNat(user_fee),
    total_amount: optNat(total_amount),
    network_fee: optNat(network_fee),
    dependencies: deps?.length ? [deps] : [],
  };
}

const LINK_CREATION_FEE = 10_000n;

/**
 * Ensure CreatorToTreasury intent has total_amount and network_fee.
 * Backend uses approve_amount = total_amount + network_fee for ICRC2;
 * missing network_fee causes InsufficientAllowance { allowance: Nat(0) } when transferring to treasury.
 */
function ensureTreasuryIntentFees(intent: {
  dest_address_type: string;
  total_amount?: bigint;
  network_fee?: bigint;
  amount?: bigint;
}): void {
  const destType = String(intent.dest_address_type ?? "");
  if (destType !== "Treasury") return;

  const treasuryFees = calculateIntentFees({
    intent_participants: IntentParticipants.CreatorToTreasury,
    token_standard: TokenStandard.ICRC2,
    link_creation_fee: LINK_CREATION_FEE,
    asset_network_fee: ICP_LEDGER_FEE,
  });

  intent.total_amount = BigInt(treasuryFees.intent_total_amount);
  intent.network_fee = BigInt(treasuryFees.intent_total_network_fee);
  intent.amount = LINK_CREATION_FEE;
}

/**
 * Validate Treasury intent has required fee fields before sending to backend.
 * Prevents InsufficientAllowance when backend decodes optional fields as None.
 */
function validateTreasuryIntent(intent: {
  dest_address_type: string;
  total_amount?: bigint;
  network_fee?: bigint;
}): void {
  const destType = String(intent.dest_address_type ?? "");
  if (destType !== "Treasury") return;

  if (
    intent.total_amount === undefined ||
    intent.network_fee === undefined ||
    intent.total_amount <= 0n ||
    intent.network_fee <= 0n
  ) {
    throw new Error(
      `CreatorToTreasury intent must have total_amount and network_fee for ICRC2 approve. ` +
        `Got total_amount=${String(intent.total_amount)} network_fee=${String(intent.network_fee)}. ` +
        `This causes InsufficientAllowance when transferring fee to treasury.`,
    );
  }
}

/**
 * Build CreateLinkInputV3 for createLinkV3 API from CreateLinkData and shared Action.
 * Used only for LinkType.TIP_SHARED_TEST.
 * Structure matches types.schema.json (Intent, Action) for backend compatibility.
 */
export function buildCreateLinkInputV3(
  createLinkData: CreateLinkData,
  action: Action | null,
): Result<CreateLinkInputV3, Error> {
  if (createLinkData.linkType !== LinkType.TIP_SHARED_TEST) {
    return Err(new Error("buildCreateLinkInputV3 is only for TIP_SHARED_TEST"));
  }
  if (!action || !action.intents?.length) {
    return Err(
      new Error("Action with intents is required for TIP_SHARED_TEST creation"),
    );
  }

  // Ensure CreatorToTreasury intent has network_fee - required for approve_amount (total_amount + network_fee)
  for (const intent of action.intents) {
    ensureTreasuryIntentFees(intent as Parameters<typeof ensureTreasuryIntentFees>[0]);
  }

  // Validate before sending - prevents InsufficientAllowance if backend receives None for opt fields
  for (const intent of action.intents) {
    validateTreasuryIntent(intent as Parameters<typeof validateTreasuryIntent>[0]);
  }

  const candidAction = {
    ...action,
    action_type: toVariant(action.action_type),
    action_state: toVariant(action.action_state),
    creator_address_type: toVariant(action.creator_address_type),
    intents: action.intents.map((i) =>
      toCandidIntent(
        {
          id: i.id,
          amount: i.amount,
          intent_type: i.intent_type,
          intent_state: i.intent_state,
          source_address_type: i.source_address_type,
          dest_address_type: i.dest_address_type,
          source_address: i.source_address,
          dest_address: i.dest_address,
          asset: i.asset,
          user_fee: (i as { user_fee?: bigint }).user_fee,
          total_amount: (i as { total_amount?: bigint }).total_amount,
          network_fee: (i as { network_fee?: bigint }).network_fee,
          dependencies: (i as { dependencies?: string[] }).dependencies,
        },
        action.id,
      ),
    ),
    link_id: action.link_id ? [action.link_id] : [],
    intent_ids: action.intent_ids?.length ? [action.intent_ids] : [],
  };

  return Ok({
    title: createLinkData.title,
    link_type: { SendTip: null } as unknown as CreateLinkInputV3["link_type"],
    max_use: createLinkData.maxUse || 1,
    action: candidAction as unknown as CreateLinkInputV3["action"],
  });
}
