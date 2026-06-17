import { describe, it, expect } from "vitest";
import { buildXAuthUrl } from "./x-oauth";

const fixture_of_params = (
  overrides?: Partial<{ clientId: string; redirectUri: string; state: string }>,
) => ({
  clientId: "test_client_id",
  redirectUri: "https://gate.example.com/auth",
  state: "test_state_123",
  ...overrides,
});

describe("buildXAuthUrl", () => {
  it("it_should_build_correct_url_with_required_params", () => {
    const url = buildXAuthUrl(fixture_of_params());

    expect(url).toContain("https://x.com/i/oauth2/authorize");
    expect(url).toContain("client_id=test_client_id");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=test_state_123");
  });

  it("it_should_include_all_required_scopes", () => {
    const url = buildXAuthUrl(fixture_of_params());

    expect(url).toContain("users.read");
    expect(url).toContain("tweet.read");
    expect(url).toContain("like.read");
    expect(url).toContain("offline.access");
    expect(url).toContain("follows.read");
  });

  it("it_should_url_encode_redirect_uri", () => {
    const url = buildXAuthUrl(
      fixture_of_params({ redirectUri: "https://gate.example.com/auth" }),
    );

    expect(url).toContain("redirect_uri=https%3A%2F%2Fgate.example.com%2Fauth");
  });

  it("it_should_set_code_challenge_to_plain_challenge", () => {
    const url = buildXAuthUrl(fixture_of_params());

    expect(url).toContain("code_challenge=challenge");
    expect(url).toContain("code_challenge_method=plain");
  });

  it("it_should_include_state_param", () => {
    const url = buildXAuthUrl(fixture_of_params({ state: "my_state_value" }));

    expect(url).toContain("state=my_state_value");
  });
});
