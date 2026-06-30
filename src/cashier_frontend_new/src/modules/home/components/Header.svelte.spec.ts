// @vitest-environment jsdom
import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header.svelte";

const mockUserProfile = vi.hoisted(() => ({
  isLoggedIn: vi.fn(() => false),
}));

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) =>
      key === "home.header.login"
        ? "Login"
        : key === "links.walletButton.openWallet"
          ? "Open wallet"
          : key === "links.menuButton.openMenu"
            ? "Open menu"
            : key,
  },
}));

vi.mock("$modules/ui/components/CashierLogo.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$modules/shared/services/userProfile.svelte", () => ({
  userProfile: mockUserProfile,
}));

vi.mock("$modules/shared/components/WalletDrawer.svelte", () => ({
  default: vi.fn(),
}));

describe("Header", () => {
  beforeEach(() => {
    mockUserProfile.isLoggedIn.mockReturnValue(false);
  });

  it("renders the login button by default", () => {
    render(Header);

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("hides the login button when showLogin is false", () => {
    render(Header, {
      props: {
        showLogin: false,
      },
    });

    expect(
      screen.queryByRole("button", { name: "Login" }),
    ).not.toBeInTheDocument();
  });

  it("renders wallet actions when the user is logged in", () => {
    mockUserProfile.isLoggedIn.mockReturnValue(true);

    render(Header);

    expect(
      screen.getByRole("button", { name: "Open wallet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Login" }),
    ).not.toBeInTheDocument();
  });
});
