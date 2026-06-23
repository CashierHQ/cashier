import { locale } from "$lib/i18n";
import { LinkStep } from "$modules/links/types/linkStep";

/**
 * Returns the mobile header title for the create-link flow.
 */
export function getCreateLinkHeaderDisplayName(
  createLinkStep: LinkStep | null | undefined,
): string {
  if (createLinkStep === LinkStep.ADD_ASSET) {
    return locale.t("links.linkForm.header.addAssets");
  }

  if (createLinkStep === LinkStep.LOCK) {
    return locale.t("links.linkForm.lock.title");
  }

  if (
    createLinkStep === LinkStep.PREVIEW ||
    createLinkStep === LinkStep.CREATED
  ) {
    return locale.t("links.linkForm.header.createLink");
  }

  return locale.t("links.linkForm.header.linkName");
}
