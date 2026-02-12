import type { CreateLinkInputV3 } from "$modules/links/types/linkV3";
import type { CreateLinkData } from "$modules/creationLink/types/createLinkData";
import type { Action } from "$shared";
import { LinkType } from "$modules/links/types/link/linkType";
import { Err, Ok, type Result } from "ts-results-es";

function toVariant(value: string): Record<string, null> {
  return { [value]: null } as Record<string, null>;
}

/**
 * Map shared Intent to Candid Intent format for createLinkV3.
 * Backend expects: user_fee, total_amount, network_fee, dependencies as [] | [T].
 * intent_type, source_address_type, dest_address_type, intent_state as variants.
 */
function toCandidIntent(intent: {
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
}): Record<string, unknown> {
  const { user_fee, total_amount, network_fee, dependencies: deps } = intent;

  const asset = intent.asset as { address: unknown; token_standard?: string };
  const assetCandid = {
    address: asset.address,
    token_standard: asset.token_standard ? [{ [asset.token_standard]: null }] : [],
    network_fee: [] as unknown,
  };

  return {
    id: intent.id,
    amount: intent.amount,
    intent_type: intent.intent_type === "Receive" ? { Receive: null } : { Send: null },
    intent_state: { [intent.intent_state]: null } as Record<string, null>,
    source_address_type: { [intent.source_address_type]: null } as Record<string, null>,
    dest_address_type: { [intent.dest_address_type]: null } as Record<string, null>,
    source_address: intent.source_address,
    dest_address: intent.dest_address,
    asset: assetCandid,
    user_fee: user_fee !== undefined ? [user_fee] : [],
    total_amount: total_amount !== undefined ? [total_amount] : [],
    network_fee: network_fee !== undefined ? [network_fee] : [],
    dependencies: deps?.length ? [deps] : [],
  };
}

/**
 * Build CreateLinkInputV3 for createLinkV3 API from CreateLinkData and shared Action.
 * Used only for LinkType.TIP_SHARED_TEST.
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

  const candidAction = {
    ...action,
    action_type: toVariant(action.action_type),
    action_state: toVariant(action.action_state),
    creator_address_type: toVariant(action.creator_address_type),
    intents: action.intents.map((i) =>
      toCandidIntent({
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
      }),
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
