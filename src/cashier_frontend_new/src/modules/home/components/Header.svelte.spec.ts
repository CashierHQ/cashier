// @vitest-environment jsdom
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header.svelte";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => (key === "home.header.login" ? "Login" : key),
  },
}));

vi.mock("$modules/ui/components/CashierLogo.svelte", () => ({
  default: vi.fn(),
}));

describe("Header", () => {
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
});
