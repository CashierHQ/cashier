import { describe, expect, it } from "vitest";
import { isLinkEnded } from "$modules/links/utils/linkEnded";
import { LinkState } from "$modules/links/types/link/linkState";
import type { LinkLike } from "$modules/routing/types";

describe("isLinkEnded", () => {
  it("it_should_return_false_for_undefined_link", () => {
    expect(isLinkEnded(undefined)).toBe(false);
  });

  it("it_should_return_false_for_an_active_link_with_slots_remaining", () => {
    const link: LinkLike = {
      state: LinkState.ACTIVE,
      use_count: 1n,
      max_use: 3n,
    };
    expect(isLinkEnded(link)).toBe(false);
  });

  it("it_should_return_true_when_state_is_inactive_ended", () => {
    const link: LinkLike = { state: LinkState.INACTIVE_ENDED };
    expect(isLinkEnded(link)).toBe(true);
  });

  it("it_should_return_true_when_state_is_inactive", () => {
    const link: LinkLike = { state: LinkState.INACTIVE };
    expect(isLinkEnded(link)).toBe(true);
  });

  it("it_should_return_true_when_use_count_reaches_max_use", () => {
    const link: LinkLike = {
      state: LinkState.ACTIVE,
      use_count: 3n,
      max_use: 3n,
    };
    expect(isLinkEnded(link)).toBe(true);
  });

  it("it_should_fall_back_to_legacy_use_count_fields_when_present", () => {
    const link: LinkLike = {
      state: LinkState.ACTIVE,
      link_use_action_counter: 2n,
      link_use_action_max_count: 2n,
    };
    expect(isLinkEnded(link)).toBe(true);
  });

  it("it_should_return_false_when_max_use_is_zero", () => {
    const link: LinkLike = {
      state: LinkState.ACTIVE,
      use_count: 0n,
      max_use: 0n,
    };
    expect(isLinkEnded(link)).toBe(false);
  });
});
