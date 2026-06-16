// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
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
});
