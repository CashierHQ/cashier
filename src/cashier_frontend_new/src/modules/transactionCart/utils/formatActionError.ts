/**
 * Map backend process-action errors to a friendly, user-facing message for the cart.
 *
 * Backend errors are `CanisterError` Candid variants. They reach the frontend
 * JSON-stringified (see cashierBackend.ts `.mapErr(JSON.stringify)`), possibly
 * wrapped, e.g.:
 *   Failed to process action: Error: {"LinkNoUseAvailable":{"link_id":"ba9..."}}
 *
 * We match on the typed variant KEY (stable Candid discriminant) — NOT on the
 * free-text message — so the mapping can't silently break when wording changes.
 * Only the legacy `ValidationErrors` text bucket, which has no dedicated variant,
 * still needs a narrow message check.
 */

type Translate = (key: string) => string;

const I18N = "links.linkForm.drawers.txCart.action.errors";

/**
 * Parse a raw error string into its CanisterError variant object.
 * CanisterError serialises as a single-key object, e.g. `{ LinkNoUseAvailable: {...} }`.
 */
function parseCanisterError(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Convert backend error string(s) into a single friendly message for the cart.
 * @param errors raw error strings from ProcessActionResult.errors (or a caught message)
 * @param t i18n translate function (locale.t)
 */
export function formatActionError(errors: string[], t: Translate): string {
  for (const raw of errors) {
    const err = parseCanisterError(raw);
    // Candid variants serialise as a single-key object, so the first key is the variant name.
    const variant = err ? Object.keys(err)[0] : undefined;

    switch (variant) {
      // Simultaneous-claim race / link fully claimed — dedicated typed variant.
      case "LinkNoUseAvailable":
        return t(`${I18N}.alreadyClaimed`);

      // Not enough balance/funds to complete the transaction.
      case "InsufficientBalance":
        return t(`${I18N}.insufficientFunds`);

      // ValidationErrors is a generic text bucket with no dedicated variant; the
      // sub-cases below have no own code, so a narrow message check is unavoidable.
      case "ValidationErrors": {
        const msg = String(
          (err as { ValidationErrors?: unknown }).ValidationErrors ?? "",
        );
        if (
          /unsupported link state|already exists for this link|Action of type Receive already exists/i.test(
            msg,
          )
        ) {
          return t(`${I18N}.linkUnavailable`);
        }
        break;
      }
    }
  }

  // Unknown error — never expose raw canister output; log for debugging instead.
  console.error("Unmapped process-action error:", errors.join(" "));
  return t(`${I18N}.generic`);
}
