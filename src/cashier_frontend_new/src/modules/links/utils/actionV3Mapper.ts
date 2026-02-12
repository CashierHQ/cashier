import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { ActionStateMapper } from "$modules/links/types/action/actionState";
import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import { Icrc112RequestMapper } from "$modules/icrc112/types/icrc112Request";
import { ActionTypeMapper } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import Intent from "$modules/links/types/action/intent";
import { IntentStateMapper } from "$modules/links/types/action/intentState";
import { IntentTypeMapper } from "$modules/links/types/action/intentType";
import { rsMatch } from "$lib/rsMatch";

/**
 * Map V3 backend AddressType (Creator|User|Treasury|Link) to IntentTask
 * for the CreateLink flow (CreatorToTreasury, CreatorToLink, LinkToUser).
 */
function addressTypesToIntentTask(
  source: cashierBackend.AddressType,
  dest: cashierBackend.AddressType,
): typeof IntentTask.TRANSFER_WALLET_TO_TREASURY | typeof IntentTask.TRANSFER_WALLET_TO_LINK | typeof IntentTask.TRANSFER_LINK_TO_WALLET | null {
  const src = rsMatch(source, {
    Creator: () => "Creator",
    User: () => "User",
    Treasury: () => "Treasury",
    Link: () => "Link",
  });
  const dst = rsMatch(dest, {
    Creator: () => "Creator",
    User: () => "User",
    Treasury: () => "Treasury",
    Link: () => "Link",
  });
  if (src === "Creator" && dst === "Treasury")
    return IntentTask.TRANSFER_WALLET_TO_TREASURY;
  if (src === "Creator" && dst === "Link")
    return IntentTask.TRANSFER_WALLET_TO_LINK;
  if (src === "Link" && dst === "User") return IntentTask.TRANSFER_LINK_TO_WALLET;
  return null;
}

/**
 * Build backend TransferData shape from V3 Intent (has source/dest/asset/amount).
 */
function v3IntentToBackendTransfer(
  intent: cashierBackend.Intent,
): cashierBackend.TransferData {
  return {
    to: { IC: { address: intent.dest_address, subaccount: [] } },
    from: { IC: { address: intent.source_address, subaccount: [] } },
    asset: { IC: { address: intent.asset.address } },
    amount: intent.amount,
  };
}

/**
 * Convert V3 backend Intent to frontend Intent.
 * V3 uses source_address, dest_address, asset, amount, intent_state.
 */
function mapV3IntentToFrontend(intent: cashierBackend.Intent): Intent {
  const task = addressTypesToIntentTask(
    intent.source_address_type,
    intent.dest_address_type,
  );
  const transferData = v3IntentToBackendTransfer(intent);
  const type = IntentTypeMapper.fromBackendType({ Transfer: transferData });
  const state = IntentStateMapper.fromBackendType(intent.intent_state);
  const resolvedTask = task ?? IntentTask.TRANSFER_WALLET_TO_LINK;
  return new Intent(intent.id, resolvedTask, type, 0n, state);
}

/**
 * Unwrap icrc112_requests from Candid Opt or use as-is if already 2D array.
 * Backend returns [] | [Array<Array<Icrc112Request>>].
 */
function unwrapIcrc112Requests(
  val:
    | []
    | [Array<Array<cashierBackend.Icrc112Request>>]
    | Array<Array<cashierBackend.Icrc112Request>>
    | null
    | undefined,
): Array<Array<cashierBackend.Icrc112Request>> | undefined {
  if (val == null) return undefined;
  if (val.length === 0) return undefined;
  // Candid Some: [Array<Array<Icrc112Request>>] - single element is the 2D array
  if (val.length === 1 && Array.isArray(val[0])) {
    return val[0] as Array<Array<cashierBackend.Icrc112Request>>;
  }
  // Already unwrapped: Array<Array<Icrc112Request>>
  return val as Array<Array<cashierBackend.Icrc112Request>>;
}

/**
 * Convert V3 backend Action to frontend Action.
 * Used when fetching TIP_SHARED_TEST links via getLinkDetailsV3.
 * @param action V3 backend Action
 * @param icrc112Requests Candid Opt or 2D array from CreateLinkResponseV3 / ProcessActionResponseV3
 */
export function mapV3ActionToFrontend(
  action: cashierBackend.Action,
  icrc112Requests?:
    | []
    | [Array<Array<cashierBackend.Icrc112Request>>]
    | Array<Array<cashierBackend.Icrc112Request>>
    | null,
): Action {
  const intents = action.intents.map((i) => mapV3IntentToFrontend(i));
  const type = ActionTypeMapper.fromBackendType(action.action_type);
  const state = ActionStateMapper.fromBackendType(action.action_state);
  const rawIcrc = unwrapIcrc112Requests(icrc112Requests);
  let icrc: Icrc112Request[][] | undefined;
  if (rawIcrc && rawIcrc.length > 0) {
    icrc = rawIcrc.map((batch) =>
      batch.map((r) => Icrc112RequestMapper.fromBackendType(r)),
    );
  }
  return new Action(action.id, action.creator, type, state, intents, icrc);
}

/**
 * Map ProcessActionResponseV3 to ProcessActionResult.
 * Used for TIP_SHARED_TEST when processActionV3 is called.
 */
export function mapV3ProcessActionResult(
  result: {
    action: cashierBackend.Action;
    is_success: boolean;
    errors: string[];
    /** Candid Opt from backend: [] | [Array<Array<Icrc112Request>>] */
    icrc112_requests?:
      | []
      | [Array<Array<cashierBackend.Icrc112Request>>]
      | null;
  },
): ProcessActionResult {
  const action = mapV3ActionToFrontend(result.action, result.icrc112_requests);
  return {
    action,
    isSuccess: result.is_success,
    errors: result.errors,
  };
}
