// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TransactionLocksDrawer from "$modules/creationLink/components/drawers/TransactionLocksDrawer.svelte";
import { GateType } from "$modules/gating/types/gate";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

describe("TransactionLocksDrawer", () => {
  let originalWarn: typeof console.warn;

  function buildGateForUser(key: GateForUser["gate"]["key"]): GateForUser {
    return {
      gate: {
        id: "gate-1",
        key,
        creator: {} as GateForUser["gate"]["creator"],
        subject_id: "link-1",
      },
      gate_user_status: [],
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    originalWarn = console.warn;
    vi.spyOn(console, "warn").mockImplementation((message, ...args) => {
      if (String(message).includes("derived_inert")) return;
      originalWarn(message, ...args);
    });
  });

  afterEach(() => {
    cleanup();
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("it_should_do_render_active_locks_as_read_only_when_open", () => {
    // Arrange
    render(TransactionLocksDrawer, {
      props: {
        open: true,
        locks: [
          {
            type: GateType.PASSWORD,
            password: "secret",
          },
        ],
      },
    });

    // Assert
    expect(
      screen.getByText("links.linkForm.drawers.transactionLocks.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("links.linkForm.lock.password"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("************")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.getByRole("button", {
        name: "links.linkForm.drawers.transactionLocks.closeButton",
      }),
    ).toBeInTheDocument();
  });

  it("it_should_do_reveal_password_when_eye_button_clicked", async () => {
    // Arrange
    render(TransactionLocksDrawer, {
      props: {
        open: true,
        locks: [
          {
            type: GateType.PASSWORD,
            password: "secret",
          },
        ],
      },
    });

    // Act
    await fireEvent.click(
      screen.getByRole("button", {
        name: "links.linkForm.lock.showPassword",
      }),
    );

    // Assert
    expect(screen.getByDisplayValue("secret")).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", {
        name: "links.linkForm.lock.hidePassword",
      }),
    ).toBeInTheDocument();
  });

  it("it_should_do_render_redacted_backend_password_gate_without_reveal_button", () => {
    // Arrange
    render(TransactionLocksDrawer, {
      props: {
        open: true,
        locks: [buildGateForUser({ PasswordRedacted: null })],
      },
    });

    // Assert
    expect(
      screen.getByText("links.linkForm.lock.password"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("************")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.queryByRole("button", {
        name: "links.linkForm.lock.showPassword",
      }),
    ).not.toBeInTheDocument();
  });

  it("it_should_do_reveal_backend_password_gate_when_password_value_exists", async () => {
    // Arrange
    render(TransactionLocksDrawer, {
      props: {
        open: true,
        locks: [buildGateForUser({ Password: "backend-secret" })],
      },
    });

    // Act
    await fireEvent.click(
      screen.getByRole("button", {
        name: "links.linkForm.lock.showPassword",
      }),
    );

    // Assert
    expect(screen.getByDisplayValue("backend-secret")).toHaveAttribute(
      "readonly",
    );
  });

  it("it_should_do_render_lock_type_icons_matching_gate_options", () => {
    const { baseElement } = render(TransactionLocksDrawer, {
      props: {
        open: true,
        locks: [
          { type: GateType.PASSWORD, password: "secret" },
          { type: GateType.X_OWNED_ACCOUNT, targetHandle: "cashier" },
          { type: GateType.OTP_EMAIL, email: "user@example.com" },
          { type: GateType.OTP_SMS, phone: "+14379830751" },
        ],
      },
    });

    expect(
      baseElement.querySelector('[data-lock-icon="password"]'),
    ).toBeTruthy();
    expect(baseElement.querySelector('[data-lock-icon="x"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-lock-icon="email"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-lock-icon="phone"]')).toBeTruthy();
  });
});
