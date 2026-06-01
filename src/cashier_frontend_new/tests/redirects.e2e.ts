import { expect, test, type Page } from "@playwright/test";

type AuthMode = "owner" | "otherUser" | "loggedOut";
type LinkState =
  | "noState"
  | "chooseType"
  | "addAsset"
  | "lock"
  | "preview"
  | "created"
  | "active"
  | "inactive"
  | "ended";
type UserState =
  | "noState"
  | "landing"
  | "addressUnlocked"
  | "addressLocked"
  | "gate"
  | "completed";

type E2EUrlOptions = {
  auth?: AuthMode;
  linkState?: LinkState;
  userState?: UserState;
  linkExists?: boolean;
  linkEnded?: boolean;
};

function e2eUrl(path: string, options: E2EUrlOptions = {}) {
  const params = new URLSearchParams({
    e2eRedirect: "1",
    auth: options.auth ?? "owner",
  });

  if (options.linkState) params.set("linkState", options.linkState);
  if (options.userState) params.set("userState", options.userState);
  if (options.linkExists === false) params.set("linkExists", "false");
  if (options.linkEnded === true) params.set("linkEnded", "true");

  return `${path}?${params}`;
}

async function expectPath(page: Page, pathname: string) {
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === pathname && url.searchParams.get("e2eRedirect") === "1"
    );
  });
}

async function expectScreen(page: Page, screen: string) {
  const marker = page.getByTestId("e2e-redirect-screen");
  await expect(marker).toBeVisible();
  await expect(marker.getByText(`Screen: ${screen}`)).toBeVisible();
}

test.describe("redirect routing", () => {
  test.describe("logged-out routes", () => {
    test("[LO-01] logged-out user can access landing", async ({ page }) => {
      await page.goto(e2eUrl("/", { auth: "loggedOut" }));

      await expectPath(page, "/");
      await expectScreen(page, "home");
    });

    test("[LO-02] logged-out user is redirected from link list to home", async ({
      page,
    }) => {
      await page.goto(e2eUrl("/links", { auth: "loggedOut" }));

      await expectPath(page, "/");
      await expectScreen(page, "home");
    });

    for (const [id, label, path, linkState] of [
      ["LO-03", "choose type", "/link/create/e2e-link", "chooseType"],
      ["LO-04", "add asset", "/link/create/e2e-link", "addAsset"],
      ["LO-05", "lock", "/link/create/e2e-link", "lock"],
      ["LO-06", "preview", "/link/create/e2e-link", "preview"],
      ["LO-07", "link detail", "/link/detail/e2e-link", "active"],
    ] as const) {
      test(`[${id}] logged-out user is redirected from ${label} to home`, async ({
        page,
      }) => {
        await page.goto(e2eUrl(path, { auth: "loggedOut", linkState }));

        await expectPath(page, "/");
        await expectScreen(page, "home");
      });
    }
  });

  test.describe("no-state link", () => {
    for (const [id, label, path] of [
      ["NS-03", "choose type", "/link/create/e2e-link"],
      ["NS-04", "add asset", "/link/create/e2e-link"],
      ["NS-05", "lock", "/link/create/e2e-link"],
      ["NS-06", "preview", "/link/create/e2e-link"],
      ["NS-07", "link detail", "/link/detail/e2e-link"],
    ] as const) {
      test(`[${id}] no-state link redirects from ${label} to link list`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl(path, { auth: "owner", linkState: "noState" }),
        );

        await expectPath(page, "/links");
        await expectScreen(page, "linkList");
      });
    }
  });

  for (const createState of [
    {
      group: "choose-type link",
      prefix: "CT",
      linkState: "chooseType",
      screen: "createChooseType",
    },
    {
      group: "add-asset link",
      prefix: "AA",
      linkState: "addAsset",
      screen: "createAddAsset",
    },
    {
      group: "preview link",
      prefix: "PV",
      linkState: "preview",
      screen: "createPreview",
    },
    {
      group: "created link",
      prefix: "CR",
      linkState: "created",
      screen: "createCreated",
    },
  ] as const) {
    test.describe(createState.group, () => {
      for (const [suffix, label] of [
        ["03", "choose type"],
        ["04", "add asset"],
        ["05", "lock"],
        ["06", "preview"],
      ] as const) {
        test(`[${createState.prefix}-${suffix}] owner lands on ${label} and sees ${createState.screen}`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl("/link/create/e2e-link", {
              auth: "owner",
              linkState: createState.linkState,
            }),
          );

          await expectPath(page, "/link/create/e2e-link");
          await expectScreen(page, createState.screen);
        });
      }

      test(`[${createState.prefix}-07] owner detail route resolves correctly`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl("/link/detail/e2e-link", {
            auth: "owner",
            linkState: createState.linkState,
          }),
        );

        if (createState.linkState === "created") {
          await expectPath(page, "/link/detail/e2e-link");
          await expectScreen(page, "linkDetail");
        } else {
          await expectPath(page, "/link/create/e2e-link");
          await expectScreen(page, createState.screen);
        }
      });

      for (const [suffix, label, path] of [
        ["08", "choose type", "/link/create/e2e-link"],
        ["09", "add asset", "/link/create/e2e-link"],
        ["10", "lock", "/link/create/e2e-link"],
        ["11", "preview", "/link/create/e2e-link"],
        ["12", "link detail", "/link/detail/e2e-link"],
      ] as const) {
        test(`[${createState.prefix}-${suffix}] other user is redirected from ${label} to link list`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl(path, {
              auth: "otherUser",
              linkState: createState.linkState,
            }),
          );

          await expectPath(page, "/links");
          await expectScreen(page, "linkList");
        });
      }
    });
  }

  for (const detailState of [
    { group: "active link", prefix: "AC", linkState: "active" },
    { group: "inactive link", prefix: "IN", linkState: "inactive" },
    { group: "inactive-ended link", prefix: "IE", linkState: "ended" },
  ] as const) {
    test.describe(detailState.group, () => {
      for (const [suffix, label] of [
        ["03", "choose type"],
        ["04", "add asset"],
        ["05", "lock"],
        ["06", "preview"],
      ] as const) {
        test(`[${detailState.prefix}-${suffix}] owner is redirected from ${label} to detail`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl("/link/create/e2e-link", {
              auth: "owner",
              linkState: detailState.linkState,
            }),
          );

          await expectPath(page, "/link/detail/e2e-link");
          await expectScreen(page, "linkDetail");
        });
      }

      test(`[${detailState.prefix}-07] owner stays on detail`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl("/link/detail/e2e-link", {
            auth: "owner",
            linkState: detailState.linkState,
          }),
        );

        await expectPath(page, "/link/detail/e2e-link");
        await expectScreen(page, "linkDetail");
      });

      for (const [suffix, label, path] of [
        ["08", "choose type", "/link/create/e2e-link"],
        ["09", "add asset", "/link/create/e2e-link"],
        ["10", "lock", "/link/create/e2e-link"],
        ["11", "preview", "/link/create/e2e-link"],
        ["12", "link detail", "/link/detail/e2e-link"],
      ] as const) {
        test(`[${detailState.prefix}-${suffix}] other user is redirected from ${label} to link list`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl(path, {
              auth: "otherUser",
              linkState: detailState.linkState,
            }),
          );

          await expectPath(page, "/links");
          await expectScreen(page, "linkList");
        });
      }
    });
  }

  test.describe("public user routes", () => {
    test("[UL-01] logged-out user can see public user landing", async ({
      page,
    }) => {
      await page.goto(
        e2eUrl("/link/e2e-link", {
          auth: "loggedOut",
          linkState: "active",
        }),
      );

      await expectPath(page, "/link/e2e-link");
      await expectScreen(page, "userLanding");
    });

    for (const [id, label, userState] of [
      ["UL-02", "address unlocked", "addressUnlocked"],
      ["UL-03", "address locked", "addressLocked"],
      ["UL-04", "gate", "gate"],
      ["UL-05", "completed", "completed"],
    ] as const) {
      test(`[${id}] logged-out user is redirected from ${label} to public user landing`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl("/link/e2e-link/use", {
            auth: "loggedOut",
            linkState: "active",
            userState,
          }),
        );

        await expectPath(page, "/link/e2e-link");
        await expectScreen(page, "userLanding");
      });
    }

    for (const [id, label, path] of [
      ["UE-01", "landing", "/link/e2e-link"],
      ["UE-02", "address unlocked", "/link/e2e-link/use"],
      ["UE-03", "address locked", "/link/e2e-link/use"],
      ["UE-04", "gate", "/link/e2e-link/use"],
      ["UE-05", "completed", "/link/e2e-link/use"],
    ] as const) {
      test(`[${id}] ended link before completion shows link ended from ${label}`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl(path, {
            auth: "otherUser",
            linkState: "ended",
            userState: "addressUnlocked",
            linkEnded: true,
          }),
        );

        await expectScreen(page, "linkEnded");
      });
    }

    for (const [id, label, path, auth] of [
      ["UI-01", "logged-out landing", "/link/e2e-link", "loggedOut"],
      ["UI-02", "logged-in landing", "/link/e2e-link", "otherUser"],
      ["UI-03", "logged-in use flow", "/link/e2e-link/use", "otherUser"],
    ] as const) {
      test(`[${id}] inactive public link shows link ended from ${label}`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl(path, {
            auth,
            linkState: "inactive",
            userState: "addressUnlocked",
            linkEnded: true,
          }),
        );

        await expectScreen(page, "linkEnded");
      });
    }

    for (const [id, label, userState] of [
      ["UN", "no user state", "noState"],
      ["ULS", "landing state", "landing"],
    ] as const) {
      test(`[${id}-01] ${label} renders user landing`, async ({ page }) => {
        await page.goto(
          e2eUrl("/link/e2e-link", {
            auth: "otherUser",
            linkState: "active",
            userState,
          }),
        );

        await expectPath(page, "/link/e2e-link");
        await expectScreen(page, "userLanding");
      });

      for (const [suffix, routeLabel] of [
        ["02", "address unlocked"],
        ["03", "address locked"],
        ["04", "gate"],
        ["05", "completed"],
      ] as const) {
        test(`[${id}-${suffix}] ${label} redirects from ${routeLabel} to landing`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl("/link/e2e-link/use", {
              auth: "otherUser",
              linkState: "active",
              userState,
            }),
          );

          await expectPath(page, "/link/e2e-link");
          await expectScreen(page, "userLanding");
        });
      }
    }

    for (const [id, label, userState, screen, linkState, linkEnded] of [
      [
        "UA",
        "address unlocked",
        "addressUnlocked",
        "userAddressUnlocked",
        "active",
        false,
      ],
      [
        "ULK",
        "address locked",
        "addressLocked",
        "userAddressLocked",
        "active",
        false,
      ],
      ["UG", "gate", "gate", "userGate", "active", false],
      ["UC", "completed", "completed", "userCompleted", "ended", true],
    ] as const) {
      test(`[${id}-01] ${label} redirects from user landing to use`, async ({
        page,
      }) => {
        await page.goto(
          e2eUrl("/link/e2e-link", {
            auth: "otherUser",
            linkState,
            userState,
            linkEnded,
          }),
        );

        await expectPath(page, "/link/e2e-link/use");
        await expectScreen(page, screen);
      });

      for (const [suffix, routeLabel] of [
        ["02", "address unlocked"],
        ["03", "address locked"],
        ["04", "gate"],
        ["05", "completed"],
      ] as const) {
        test(`[${id}-${suffix}] ${label} renders from ${routeLabel}`, async ({
          page,
        }) => {
          await page.goto(
            e2eUrl("/link/e2e-link/use", {
              auth: "otherUser",
              linkState,
              userState,
              linkEnded,
            }),
          );

          await expectPath(page, "/link/e2e-link/use");
          await expectScreen(page, screen);
        });
      }
    }
  });

  test.describe("invalid public link", () => {
    test("[IP-01] invalid public landing link redirects to not found", async ({
      page,
    }) => {
      await page.goto(
        e2eUrl("/link/missing-link", {
          auth: "loggedOut",
          linkExists: false,
        }),
      );

      await expectPath(page, "/404");
      await expect(page.getByText("Page not found")).toBeVisible();
    });

    test("[IP-02] invalid public use link redirects to not found", async ({
      page,
    }) => {
      await page.goto(
        e2eUrl("/link/missing-link/use", {
          auth: "otherUser",
          linkExists: false,
        }),
      );

      await expectPath(page, "/404");
      await expect(page.getByText("Page not found")).toBeVisible();
    });
  });
});
