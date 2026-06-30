import type {
  DraftLink,
  DraftLinkStorageRecord,
} from "$modules/creationLink/types";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  LinkState as SharedLinkStateValue,
  type Link as SharedLink,
  type LinkState as SharedLinkState,
} from "$shared";

/**
 * Checks whether a parsed localStorage value uses the draft-link envelope.
 *
 * @param value - Parsed localStorage value to inspect.
 * @returns `true` when the value contains a stored shared link.
 */
export function isDraftLinkStorageRecord(
  value: unknown,
): value is DraftLinkStorageRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "link" in value &&
    typeof value.link === "object" &&
    value.link !== null
  );
}

/**
 * Maps a shared link lifecycle state to the closest create-flow step.
 *
 * @param linkState - Persisted shared link lifecycle state.
 * @returns Matching create-flow step when one exists.
 */
export function deriveCreationStepFromLinkState(
  linkState: SharedLinkState,
): LinkStep | undefined {
  switch (linkState) {
    case SharedLinkStateValue.ChooseType:
      return LinkStep.CHOOSE_TYPE;
    case SharedLinkStateValue.AddAsset:
      return LinkStep.ADD_ASSET;
    case SharedLinkStateValue.Preview:
      return LinkStep.PREVIEW;
    case SharedLinkStateValue.Created:
      return LinkStep.CREATED;
    default:
      return undefined;
  }
}

/**
 * Converts either current or legacy localStorage records into draft links.
 *
 * @param record - Current draft-link envelope or legacy shared link.
 * @returns Draft link with create-flow metadata restored.
 */
export function toDraftLink(
  record: DraftLinkStorageRecord | SharedLink,
): DraftLink {
  if (isDraftLinkStorageRecord(record)) {
    return {
      ...record.link,
      creationStep:
        record.creationStep ??
        deriveCreationStepFromLinkState(record.link.link_state),
    };
  }

  return {
    ...record,
    creationStep: deriveCreationStepFromLinkState(record.link_state),
  };
}

/**
 * Converts a draft link into the localStorage envelope shape.
 *
 * @param draftLink - Draft link to persist.
 * @returns Storage record containing backend-compatible link data and UI step.
 */
export function toDraftLinkStorageRecord(
  draftLink: DraftLink,
): DraftLinkStorageRecord {
  const { creationStep, ...link } = draftLink;

  return {
    link,
    creationStep,
  };
}
