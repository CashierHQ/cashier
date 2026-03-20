// @vitest-environment jsdom
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import FeeInfoDrawer from "./FeeInfoDrawer.svelte";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

function fixture_of_fees_breakdown() {
  return [
    {
      name: "Network fee",
      amount: 300n,
      tokenAddress: "token-ckusdc-address",
      tokenSymbol: "ckUSDC",
      tokenDecimals: 6,
      usdAmount: 0.0003,
    },
    {
      name: "Link creation fee",
      amount: 30_000n,
      tokenAddress: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      tokenSymbol: "ICP",
      tokenDecimals: 8,
      usdAmount: 0.0015,
    },
  ];
}

describe("FeeInfoDrawer", () => {
  it("it_should_do_render_fee_breakdown_rows_when_open", () => {
    // Arrange
    render(FeeInfoDrawer, {
      props: {
        open: true,
        feesBreakdown: fixture_of_fees_breakdown(),
      },
    });

    // Act
    const networkFeeRows = screen.getAllByText("Network fee");

    // Assert
    expect(
      screen.getByText("links.linkForm.preview.feesBreakdown"),
    ).toBeInTheDocument();
    expect(networkFeeRows).toHaveLength(1);
    expect(screen.getByText("Link creation fee")).toBeInTheDocument();
    expect(screen.getByText("0.0003 ckUSDC")).toBeInTheDocument();
    expect(screen.getByText("0.0003 ICP")).toBeInTheDocument();
  });
});
