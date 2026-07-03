import { locale } from "$lib/i18n";
import { LinkStep } from "$modules/links/types/linkStep";

/**
 * Resolves the filled progress-bar segment count for the create-link flow.
 *
 * @param linkStep - Current create-link flow step.
 * @returns Number of progress segments that should be filled.
 */
export function getCreateLinkProgress(linkStep: LinkStep): number {
  if (linkStep === LinkStep.CHOOSE_TYPE) return 1;
  if (linkStep === LinkStep.ADD_ASSET) return 2;
  if (linkStep === LinkStep.LOCK) return 3;
  if (linkStep === LinkStep.PREVIEW || linkStep === LinkStep.CREATED) return 4;
  return 0;
}

/**
 * Resolves the card header title for the create-link flow.
 *
 * @param linkStep - Current create-link flow step.
 * @param linkTitle - Optional draft link title for non-step-specific screens.
 * @returns Localized title to display in the create-link card header.
 */
export function getCreateLinkCardHeaderDisplayName(
  linkStep: LinkStep,
  linkTitle?: string,
): string {
  if (linkStep === LinkStep.ADD_ASSET) {
    return locale.t("links.linkForm.header.addAssets");
  }

  if (linkStep === LinkStep.LOCK) {
    return locale.t("links.linkForm.lock.title");
  }

  if (linkStep === LinkStep.PREVIEW) {
    return locale.t("links.linkForm.header.createLink");
  }

  return linkTitle?.trim() || locale.t("links.linkForm.header.linkName");
}
