import { describe, expect, it } from "vitest";
import { Link } from "$modules/links/types/link/link";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import {
  isActionAlreadyExistsError,
  isUnsupportedLinkStateError,
  shouldRedirectTo404,
  shouldRedirectErrorTo404,
} from "./errorHandler";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import Action from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import { ActionState } from "$modules/links/types/action/actionState";
import { Principal } from "@dfinity/principal";

// Helper to create a mock link
function createMockLink(state: LinkStateValue = LinkState.ACTIVE): Link {
  return new Link(
    "test-link-id",
    "Test Link",
    Principal.anonymous(),
    [],
    LinkType.TIP,
    BigInt(0),
    state,
    1n,
    0n,
  );
}

// Helper to create a mock action
function createMockAction() {
  return new Action(
    "test-action-id",
    Principal.anonymous(),
    ActionType.RECEIVE,
    ActionState.CREATED,
    [],
  );
}

describe("isActionAlreadyExistsError", () => {
  it("should return true for JSON error with ValidationErrors", () => {
    const error = JSON.stringify({
      ValidationErrors: "Action of type Receive already exists for this link",
    });
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return true for error with link data in INACTIVE state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.INACTIVE,
      },
    });
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return true for error with link data in INACTIVE_ENDED state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.INACTIVE_ENDED,
      },
    });
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return false for error with link data in ACTIVE state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.ACTIVE,
      },
    });
    expect(isActionAlreadyExistsError(error)).toBe(false);
  });

  it("should return true when link parameter is INACTIVE", () => {
    const link = createMockLink(LinkState.INACTIVE);
    expect(isActionAlreadyExistsError("Some error", link)).toBe(true);
  });

  it("should return true when link parameter is INACTIVE_ENDED", () => {
    const link = createMockLink(LinkState.INACTIVE_ENDED);
    expect(isActionAlreadyExistsError("Some error", link)).toBe(true);
  });

  it("should return false when link parameter is ACTIVE", () => {
    const link = createMockLink(LinkState.ACTIVE);
    expect(isActionAlreadyExistsError("Some error", link)).toBe(false);
  });

  it("should return true for plain string error", () => {
    const error = "Action of type Receive already exists for this link";
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return true for Error object with JSON message", () => {
    const error = new Error(
      JSON.stringify({
        ValidationErrors: "Action of type Receive already exists for this link",
      }),
    );
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return true for Error object with plain message", () => {
    const error = new Error("Action of type Receive already exists");
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return true for object with ValidationErrors", () => {
    const error = {
      ValidationErrors: "Action of type Receive already exists for this link",
    };
    expect(isActionAlreadyExistsError(error)).toBe(true);
  });

  it("should return false for unrelated error", () => {
    const error = "Some other error occurred";
    expect(isActionAlreadyExistsError(error)).toBe(false);
  });

  it("should return false for JSON error without ValidationErrors or link data", () => {
    const error = JSON.stringify({ message: "Some error" });
    expect(isActionAlreadyExistsError(error)).toBe(false);
  });
});

describe("isUnsupportedLinkStateError", () => {
  it("should return true for JSON error with ValidationErrors", () => {
    const error = JSON.stringify({
      ValidationErrors: "Unsupported link state",
    });
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for error with link data in INACTIVE state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.INACTIVE,
      },
    });
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for error with link data in INACTIVE_ENDED state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.INACTIVE_ENDED,
      },
    });
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return false for error with link data in ACTIVE state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.ACTIVE,
      },
    });
    expect(isUnsupportedLinkStateError(error)).toBe(false);
  });

  it("should return false for error with link data in CREATE_LINK state", () => {
    const error = JSON.stringify({
      link: {
        id: "test-link",
        state: LinkState.CREATE_LINK,
      },
    });
    expect(isUnsupportedLinkStateError(error)).toBe(false);
  });

  it("should return true when link parameter is INACTIVE", () => {
    const link = createMockLink(LinkState.INACTIVE);
    expect(isUnsupportedLinkStateError("Some error", link)).toBe(true);
  });

  it("should return true when link parameter is INACTIVE_ENDED", () => {
    const link = createMockLink(LinkState.INACTIVE_ENDED);
    expect(isUnsupportedLinkStateError("Some error", link)).toBe(true);
  });

  it("should return false when link parameter is ACTIVE", () => {
    const link = createMockLink(LinkState.ACTIVE);
    expect(isUnsupportedLinkStateError("Some error", link)).toBe(false);
  });

  it("should return false when link parameter is CREATE_LINK", () => {
    const link = createMockLink(LinkState.CREATE_LINK);
    expect(isUnsupportedLinkStateError("Some error", link)).toBe(false);
  });

  it("should return true for plain string error", () => {
    const error = "Unsupported link state";
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for Error object with JSON message", () => {
    const error = new Error(
      JSON.stringify({
        ValidationErrors: "Unsupported link state",
      }),
    );
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for Error object with plain message", () => {
    const error = new Error("Unsupported link state");
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for object with ValidationErrors", () => {
    const error = {
      ValidationErrors: "Unsupported link state",
    };
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return true for object with non-ACTIVE linkState", () => {
    const error = {
      linkState: LinkState.INACTIVE,
    };
    expect(isUnsupportedLinkStateError(error)).toBe(true);
  });

  it("should return false for unrelated error", () => {
    const error = "Some other error occurred";
    expect(isUnsupportedLinkStateError(error)).toBe(false);
  });

  it("should return false for JSON error without ValidationErrors or link data", () => {
    const error = JSON.stringify({ message: "Some error" });
    expect(isUnsupportedLinkStateError(error)).toBe(false);
  });
});

describe("shouldRedirectTo404", () => {
  it("should return true when result has action already exists error", () => {
    const result: ProcessActionResult = {
      action: createMockAction(),
      isSuccess: false,
      errors: [
        JSON.stringify({
          ValidationErrors:
            "Action of type Receive already exists for this link",
        }),
      ],
    };
    expect(shouldRedirectTo404(result)).toBe(true);
  });

  it("should return true when result has unsupported link state error", () => {
    const result: ProcessActionResult = {
      action: createMockAction(),
      isSuccess: false,
      errors: [
        JSON.stringify({
          ValidationErrors: "Unsupported link state",
        }),
      ],
    };
    expect(shouldRedirectTo404(result)).toBe(true);
  });

  it("should return false when result is successful", () => {
    const result: ProcessActionResult = {
      action: createMockAction(),
      isSuccess: true,
      errors: [],
    };
    expect(shouldRedirectTo404(result)).toBe(false);
  });

  it("should return false when result has unrelated errors", () => {
    const result: ProcessActionResult = {
      action: createMockAction(),
      isSuccess: false,
      errors: ["Some other error"],
    };
    expect(shouldRedirectTo404(result)).toBe(false);
  });

  it("should return true when result has multiple errors including redirect error", () => {
    const result: ProcessActionResult = {
      action: createMockAction(),
      isSuccess: false,
      errors: [
        "Some other error",
        JSON.stringify({
          ValidationErrors:
            "Action of type Receive already exists for this link",
        }),
      ],
    };
    expect(shouldRedirectTo404(result)).toBe(true);
  });
});

describe("shouldRedirectErrorTo404", () => {
  it("should return true for action already exists error", () => {
    const error = JSON.stringify({
      ValidationErrors: "Action of type Receive already exists for this link",
    });
    expect(shouldRedirectErrorTo404(error)).toBe(true);
  });

  it("should return true for unsupported link state error", () => {
    const error = JSON.stringify({
      ValidationErrors: "Unsupported link state",
    });
    expect(shouldRedirectErrorTo404(error)).toBe(true);
  });

  it("should return false for unrelated error", () => {
    const error = "Some other error";
    expect(shouldRedirectErrorTo404(error)).toBe(false);
  });

  it("should return true for Error object with action already exists", () => {
    const error = new Error(
      JSON.stringify({
        ValidationErrors: "Action of type Receive already exists for this link",
      }),
    );
    expect(shouldRedirectErrorTo404(error)).toBe(true);
  });
});
