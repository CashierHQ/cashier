import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import type * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";

/**
 * Error data structure that may come from backend
 * CanisterError can be serialized as JSON string
 */
type ErrorData =
  | cashierBackend.CanisterError
  | {
      ValidationErrors?: string;
      link?: Link;
      linkState?: LinkState;
      [key: string]: unknown;
    };

/**
 * Extract CanisterError from error object or string
 */
function extractErrorData(error: unknown): ErrorData | null {
  if (typeof error === "string") {
    try {
      return JSON.parse(error) as ErrorData;
    } catch {
      return null;
    }
  } else if (error instanceof Error) {
    try {
      return JSON.parse(error.message) as ErrorData;
    } catch {
      return null;
    }
  } else if (typeof error === "object" && error !== null) {
    return error as ErrorData;
  }
  return null;
}

/**
 * Check if error is ValidationErrors type from CanisterError
 */
function isValidationErrorsError(
  errorData: ErrorData,
): errorData is { ValidationErrors: string } {
  return (
    typeof errorData === "object" &&
    errorData !== null &&
    "ValidationErrors" in errorData &&
    typeof (errorData as { ValidationErrors: unknown }).ValidationErrors ===
      "string"
  );
}

/**
 * Check if error indicates that action already exists for the link
 * Checks the error data structure (CanisterError with ValidationErrors or link data), not just text content
 */
export function isActionAlreadyExistsError(
  error: unknown,
  link?: Link,
): boolean {
  // Check link state first - this is the primary check based on link data
  // If link is INACTIVE or INACTIVE_ENDED, action already exists
  if (link) {
    if (
      link.state === LinkState.INACTIVE ||
      link.state === LinkState.INACTIVE_ENDED
    ) {
      return true;
    }
  }

  const errorData = extractErrorData(error);

  // If we can't parse the error, fall back to text check
  if (!errorData) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      errorMessage.includes("Action of type Receive already exists") ||
      errorMessage.includes("already exists for this link")
    );
  }

  // Check if it's a ValidationErrors error from CanisterError
  if (isValidationErrorsError(errorData)) {
    const validationError = errorData.ValidationErrors;
    if (
      validationError.includes("Action of type Receive already exists") ||
      validationError.includes("already exists for this link")
    ) {
      return true;
    }
  }

  // Check if error contains link data with non-ACTIVE state
  // This indicates the link was already used/claimed
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "link" in errorData
  ) {
    const linkInError = (errorData as { link: unknown }).link;
    if (
      typeof linkInError === "object" &&
      linkInError !== null &&
      "state" in linkInError
    ) {
      const linkState = (linkInError as { state: unknown }).state;
      // If link state is INACTIVE or INACTIVE_ENDED, it indicates action already exists
      if (
        linkState === LinkState.INACTIVE ||
        linkState === LinkState.INACTIVE_ENDED
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if error indicates unsupported link state
 * Checks the error data structure (CanisterError with ValidationErrors or link data), not just text content
 */
export function isUnsupportedLinkStateError(
  error: unknown,
  link?: Link,
): boolean {
  const errorData = extractErrorData(error);

  // Check link state if provided separately (from current link state)
  // This is the primary check - if link is not ACTIVE or CREATE_LINK, state is unsupported
  if (link) {
    // Only ACTIVE and CREATE_LINK states support action processing
    // If link is INACTIVE or INACTIVE_ENDED, it's unsupported for processing
    if (
      link.state === LinkState.INACTIVE ||
      link.state === LinkState.INACTIVE_ENDED
    ) {
      return true;
    }
  }

  // If we can't parse the error, fall back to text check
  if (!errorData) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes("Unsupported link state");
  }

  // Check if it's a ValidationErrors error from CanisterError
  if (isValidationErrorsError(errorData)) {
    const validationError = errorData.ValidationErrors;
    if (validationError.includes("Unsupported link state")) {
      return true;
    }
  }

  // Check if error contains link data with unsupported state
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "link" in errorData
  ) {
    const linkInError = (errorData as { link: unknown }).link;
    if (
      typeof linkInError === "object" &&
      linkInError !== null &&
      "state" in linkInError
    ) {
      const linkState = (linkInError as { state: unknown }).state;
      // If link state is INACTIVE or INACTIVE_ENDED, it's unsupported
      if (
        linkState === LinkState.INACTIVE ||
        linkState === LinkState.INACTIVE_ENDED
      ) {
        return true;
      }
    }
  }

  // Check linkState field directly in error data
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "linkState" in errorData
  ) {
    const linkState = (errorData as { linkState: unknown }).linkState;
    if (
      typeof linkState === "string" &&
      (linkState === LinkState.INACTIVE ||
        linkState === LinkState.INACTIVE_ENDED)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if ProcessActionResult contains errors that require redirect to 404
 */
export function shouldRedirectTo404(
  result: ProcessActionResult,
  link?: Link,
): boolean {
  if (result.isSuccess) {
    return false;
  }

  return result.errors.some(
    (error) =>
      isActionAlreadyExistsError(error, link) ||
      isUnsupportedLinkStateError(error, link),
  );
}

/**
 * Check if error (from catch block) requires redirect to 404
 */
export function shouldRedirectErrorTo404(error: unknown, link?: Link): boolean {
  return (
    isActionAlreadyExistsError(error, link) ||
    isUnsupportedLinkStateError(error, link)
  );
}
