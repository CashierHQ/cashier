// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

describe("FeesBreakdownSection", () => {
  it("it_should_fail_do_render_non_interactive_total_fees_due_to_missing_breakdown_click_handler", () => {
    // Arrange
    render(FeesBreakdownSection, {
      props: {
        totalFeesUsd: 0.0147,
      },
    });

    // Act
    const button = screen.queryByRole("button", {
      name: /links\.linkForm\.preview\.totalFees/i,
    });

    // Assert
    expect(button).not.toBeInTheDocument();
    expect(
      screen.getByText("links.linkForm.preview.totalFees"),
    ).toBeInTheDocument();
  });

  it("it_should_do_render_clickable_total_fees_with_chevron", () => {
    // Arrange
    render(FeesBreakdownSection, {
      props: {
        totalFeesUsd: 0.0147,
        onBreakdownClick: vi.fn(),
      },
    });

    // Act
    const button = screen.getByRole("button");

    // Assert
    expect(button).toBeInTheDocument();
    expect(
      screen.getByText("links.linkForm.preview.totalFees"),
    ).toBeInTheDocument();
    expect(screen.getByText("~$0.0147")).toBeInTheDocument();
  });

  it("it_should_do_call_breakdown_handler_when_total_fees_clicked", async () => {
    // Arrange
    const onBreakdownClick = vi.fn();
    render(FeesBreakdownSection, {
      props: {
        totalFeesUsd: 0.0147,
        onBreakdownClick,
      },
    });

    // Act
    await fireEvent.click(screen.getByRole("button"));

    // Assert
    expect(onBreakdownClick).toHaveBeenCalledTimes(1);
  });
});
