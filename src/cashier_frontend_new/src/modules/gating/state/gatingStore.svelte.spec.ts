import { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import { GateType } from "$modules/gating/types/gate";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
}));

describe("GatingStore", () => {
  it("it_should_restore_password_gate_from_draft_gates", () => {
    const store = new GatingStore([
      { type: GateType.PASSWORD, password: "secret" },
    ]);

    expect(store.hasLocks).toBe(true);
    expect(store.gateDrafts).toEqual([
      { type: GateType.PASSWORD, password: "secret" },
    ]);
  });

  it("it_should_notify_when_password_lock_is_saved", () => {
    const onChange = vi.fn();
    const store = new GatingStore([], onChange);

    store.setPassword("secret");
    store.setConfirmPassword("secret");
    store.savePasswordLock();

    expect(onChange).toHaveBeenCalledWith([
      { type: GateType.PASSWORD, password: "secret" },
    ]);
  });

  it("it_should_notify_when_gates_are_reset", () => {
    const onChange = vi.fn();
    const store = new GatingStore(
      [{ type: GateType.PASSWORD, password: "secret" }],
      onChange,
    );

    store.resetAll();

    expect(onChange).toHaveBeenCalledWith([]);
    expect(store.hasLocks).toBe(false);
  });
});
