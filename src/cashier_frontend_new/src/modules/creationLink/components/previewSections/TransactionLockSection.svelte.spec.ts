// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

describe("TransactionLockSection", () => {
  it("it_should_do_render_unlocked_state_as_non_interactive", () => {
    // Arrange
    render(TransactionLockSection, {
      props: {
        hasLocks: false,
      },
    });

    // Act
    const button = screen.queryByRole("button");

    // Assert
    expect(button).not.toBeInTheDocument();
    expect(
      screen.getByText("links.linkForm.preview.transactionLock"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("links.linkForm.preview.transactionLockStatus.unlocked"),
    ).toBeInTheDocument();
  });

  it("it_should_do_call_lock_handler_when_locked_row_clicked", async () => {
    // Arrange
    const onLockClick = vi.fn();
    render(TransactionLockSection, {
      props: {
        hasLocks: true,
        onLockClick,
      },
    });

    // Act
    await fireEvent.click(screen.getByRole("button"));

    // Assert
    expect(onLockClick).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("links.linkForm.preview.transactionLockStatus.locked"),
    ).toBeInTheDocument();
  });
});
