// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PrimaryActionButtonTestHost from "$modules/shared/components/PrimaryActionButtonTestHost.svelte";

describe("PrimaryActionButton", () => {
  it("it_should_do_render_consistent_primary_action_styles", () => {
    render(PrimaryActionButtonTestHost, {
      props: {
        label: "Continue",
      },
    });

    const button = screen.getByRole("button", { name: "Continue" });

    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("rounded-full");
    expect(button).toHaveClass("bg-green");
    expect(button).toHaveClass("text-sm");
    expect(button).toHaveClass("font-semibold");
  });

  it("it_should_do_forward_click_handler", async () => {
    const onClick = vi.fn();

    render(PrimaryActionButtonTestHost, {
      props: {
        label: "Confirm",
        onClick,
      },
    });

    const button = screen.getByRole("button", { name: "Confirm" });

    await fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("it_should_do_forward_disabled_props", () => {
    render(PrimaryActionButtonTestHost, {
      props: {
        label: "Confirm",
        disabled: true,
      },
    });

    const button = screen.getByRole("button", { name: "Confirm" });

    expect(button).toBeDisabled();
  });

  it("it_should_do_render_destructive_variant_without_green_styles", () => {
    render(PrimaryActionButtonTestHost, {
      props: {
        label: "Delete",
        variant: "destructive",
      },
    });

    const button = screen.getByRole("button", { name: "Delete" });

    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("rounded-full");
    expect(button).toHaveClass("bg-[#D26060]");
    expect(button).not.toHaveClass("bg-green");
  });

  it("it_should_do_render_destructive_tone_as_red_outline_action", () => {
    render(PrimaryActionButtonTestHost, {
      props: {
        label: "End link",
        tone: "destructive",
      },
    });

    const button = screen.getByRole("button", { name: "End link" });

    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("rounded-full");
    expect(button).toHaveClass("border-red-200");
    expect(button).toHaveClass("text-red-600");
    expect(button).toHaveClass("hover:bg-red-50");
    expect(button).not.toHaveClass("bg-green");
    expect(button).not.toHaveClass("bg-[#D26060]");
  });

  it("it_should_do_preserve_non_primary_variants", () => {
    render(PrimaryActionButtonTestHost, {
      props: {
        label: "End link",
        variant: "outline",
      },
    });

    const button = screen.getByRole("button", { name: "End link" });

    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("rounded-full");
    expect(button).toHaveClass("border");
    expect(button).not.toHaveClass("bg-green");
  });
});
