import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

test.describe.configure({ mode: "serial" });

const changedTipId = "00000000-0000-4000-8000-000000000102";
const unconfirmedTipId = "00000000-0000-4000-8000-000000000100";
const editedTipId = "00000000-0000-4000-8000-000000000109";
const observerSessionToken = "fieldnotes-development-observer-session";
const newObserverSessionToken = "fieldnotes-development-new-observer-session";
const authSecret = "fieldnotes-e2e-secret-with-more-than-thirty-two-characters";

async function signInAsObserver(page: Page, token = observerSessionToken) {
  const signature = await makeSignature(token, authSecret);
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: `${token}.${signature}`,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`core public pages fit at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const path of [
      "/",
      "/sign-in",
      "/destinations/badami",
      "/destinations/badami/add",
      `/tips/${changedTipId}`,
      `/tips/${changedTipId}/update`,
    ]) {
      await page.goto(path);
      await expect(page.locator("main").last()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
}

test("destination API pages through all enabled locations", async ({
  request,
}) => {
  const firstResponse = await request.get("/api/destinations?limit=2");
  expect(firstResponse.ok()).toBe(true);
  const first = (await firstResponse.json()) as {
    destinations: Array<{ id: string }>;
    nextCursor: string | null;
  };
  expect(first.destinations).toHaveLength(2);
  expect(first.nextCursor).toBeTruthy();

  const secondResponse = await request.get(
    `/api/destinations?limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
  );
  expect(secondResponse.ok()).toBe(true);
  const second = (await secondResponse.json()) as {
    destinations: Array<{ id: string }>;
  };
  expect(second.destinations).toHaveLength(2);
  expect(
    second.destinations.some((destination) =>
      first.destinations.some(
        (firstDestination) => firstDestination.id === destination.id,
      ),
    ),
  ).toBe(false);
});

test("homepage leads with tips and pairs four places with the map", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "A little local knowledge. A better trip.",
    }),
  ).toBeVisible();
  await expect(page.locator(".home-tip-card")).toHaveCount(3);
  await expect(page.locator(".destination-tile")).toHaveCount(4);
  await expect(
    page.getByRole("link", { name: "View all places" }),
  ).toHaveAttribute("href", "/search");

  const map = page.getByRole("navigation", { name: "Map destinations" });
  await expect(map.getByRole("link")).toHaveCount(6);
  expect(
    (await page.locator(".home-explore-map").boundingBox())?.height,
  ).toBeGreaterThanOrEqual(470);
  await expect(page.locator(".india-shape")).toHaveCSS(
    "mask-image",
    /india-outline\.svg/,
  );
  await expect(map.getByRole("link", { name: "Badami, Karnataka" })).toHaveCSS(
    "left",
    /.+/,
  );
});

test("guest mobile menu supports keyboard dismissal and focus restoration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "Explore tips" }),
  ).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Places" })).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Share a tip" }),
  ).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sign in" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("signed-in mobile menu exposes account destinations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsObserver(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "Profile", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Public profile" }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Community guidelines" }),
  ).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sign in" })).toHaveCount(0);
});

test("profile presents identity and owner actions at every breakpoint", async ({
  page,
}) => {
  await signInAsObserver(page);

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/me");

    const profile = page.locator(".account-profile-header");
    await expect(profile.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      profile.getByRole("button", { name: "Edit profile" }),
    ).toBeVisible();
    await expect(
      profile.getByRole("link", { name: "View public profile" }),
    ).toBeVisible();
    await expect(profile.getByLabel("Contribution summary")).toBeVisible();
    await expect(profile.getByRole("button", { name: "Sign out" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Your contributions" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBe(0);
  }
});

test("destination feed explains what tips contain", async ({ page }) => {
  await page.goto("/destinations/badami");

  const guide = page.locator(".destination-aside");
  await expect(
    guide.getByRole("heading", { name: "What you'll find here" }),
  ).toBeVisible();
  await expect(guide.getByText("Prices & fares")).toBeVisible();
  await expect(guide.getByText("Useful details")).toBeVisible();
  await expect(guide.getByText("Traveller tips")).toBeVisible();
});

test("destination search supports aliases and keyboard selection", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Where are you going?" });

  await search.fill("Mysore");
  await expect(page.getByRole("option", { name: /Mysuru/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/destinations\/mysuru$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mysuru" }),
  ).toBeVisible();
});

test("destination filters keep URL state and show only the selected category", async ({
  page,
}) => {
  await page.goto("/destinations/badami");
  await page
    .getByRole("navigation", { name: "Tip categories" })
    .getByRole("link", { name: /Transport/ })
    .click();

  await expect(page).toHaveURL(/category=transport/);
  await expect(
    page.getByRole("heading", { name: "Transport tips", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tip-card")).toHaveCount(4);

  await page.goBack();
  await expect(page).toHaveURL(/\/destinations\/badami$/);
  await expect(
    page
      .getByRole("navigation", { name: "Tip categories" })
      .getByRole("link", { name: /All/ }),
  ).toHaveAttribute("aria-current", "page");
});

test("destination tips load as the page approaches the end of the feed", async ({
  page,
}) => {
  await page.goto("/destinations/badami");

  const feed = page.getByRole("region", { name: "Traveller tips" });
  await expect(feed).toBeVisible();
  expect(
    await feed.evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe("visible");
  await expect(feed.locator(".tip-card")).toHaveCount(12);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  await expect(feed.locator(".tip-card")).toHaveCount(17);
  await expect(page.getByText("All 17 tips shown.")).toBeVisible();
});

test("development dialog traps focus, closes with Escape, and restores focus", async ({
  page,
}) => {
  await page.goto("/dev/components");
  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Confirm this action" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("traveller can claim a unique username and open their stable public profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto("/me");
  await page.getByRole("button", { name: "Edit profile" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await dialog.getByLabel("Display name").fill("Ananya Nair");
  await dialog.getByLabel("Username").fill("traveler-02");
  await dialog.getByRole("button", { name: "Save profile" }).click();
  await expect(dialog.locator("#profile-username-error")).toHaveText(
    "That username is taken.",
  );

  await dialog.getByLabel("Username").fill("ananya-notes");
  await dialog.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();

  await page.goto("/users/00000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ananya Nair" }),
  ).toBeVisible();
  await expect(page.getByText("@ananya-notes").first()).toBeVisible();
  await expect(page.locator(".tip-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

test("guest composer validates first, preserves its draft, and returns from sign-in", async ({
  page,
}) => {
  await page.goto("/destinations/badami/add");
  const body = page.getByRole("textbox", {
    name: "What do you wish you knew before coming here?",
  });

  await body.fill("short");
  await page.getByRole("button", { name: "Share tip" }).click();
  await expect(
    page.getByText(
      "Give the next traveller one detail they can use — for example a price, route, timing, place, or something to avoid.",
    ),
  ).toBeVisible();
  await expect(body).toBeFocused();
  await expect
    .poll(() =>
      body.evaluate((element) => {
        const styles = getComputedStyle(element);
        return styles.borderColor === styles.outlineColor;
      }),
    )
    .toBe(true);
  const invalidBorderColor = await body.evaluate(
    (element) => getComputedStyle(element).borderColor,
  );
  await page.getByRole("heading", { name: "Help the next traveller." }).click();
  await expect(body).not.toBeFocused();
  await expect
    .poll(() =>
      body.evaluate((element) => getComputedStyle(element).borderColor),
    )
    .toBe(invalidBorderColor);
  await expect
    .poll(async () => {
      const box = await body.boundingBox();
      return box ? box.y >= 0 && box.y + box.height <= 844 : false;
    })
    .toBe(true);

  const usefulTip = "The north bus stand ticket counter opens before seven.";
  await body.fill(usefulTip);
  await page.getByRole("button", { name: "Share tip" }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByText("Your tip is saved in this tab.")).toBeVisible();

  await page.goBack();
  await expect(body).toHaveValue(usefulTip);
  await expect(page.getByText("Your saved draft was restored.")).toBeVisible();
});

test("composer only offers price units relevant to the selected category", async ({
  page,
}) => {
  await page.goto("/destinations/badami/add");

  const expectedUnits = {
    Stay: [
      "Choose a unit",
      "room / night",
      "bed / night",
      "person / night",
      "day",
      "Other",
    ],
    Food: ["Choose a unit", "breakfast", "lunch", "dinner", "snacks", "Other"],
    Transport: ["Choose a unit", "person / trip", "vehicle / trip", "Other"],
    Explore: ["Choose a unit", "person entry", "Other"],
  } as const;

  for (const [category, options] of Object.entries(expectedUnits)) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await page.getByRole("button", { name: "₹ Price" }).click();
    const unit = page.getByRole("combobox", {
      name: "What the price covers",
    });
    await expect(unit.locator("option")).toHaveText(options);
  }
});

test("guest photo selection asks for sign-in before opening a file picker", async ({
  page,
}) => {
  await page.goto("/destinations/badami/add");
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "What should someone know before visiting this place?",
    })
    .fill("A draft remains available before choosing any photos.");
  await page.getByRole("button", { name: "Photo", exact: true }).click();
  await page.getByRole("button", { name: "Add photos" }).click();

  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByText("Your tip is saved in this tab.")).toBeVisible();
});

test("detail keeps the original fare and attributes the changed fare", async ({
  page,
}) => {
  await page.goto(`/tips/${changedTipId}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Badami → Pattadakal" }),
  ).toBeVisible();
  await expect(page.locator(".detail-main > .price")).toContainText("₹35");
  const update = page.locator(".update-card").first();
  await expect(update.getByText("Original report")).toBeVisible();
  await expect(update.getByText("Update reported")).toBeVisible();
  await expect(update).toContainText("₹35");
  await expect(update).toContainText("₹40");
  await expect(
    page.getByText("7 travellers confirmed this version"),
  ).toHaveCount(2);
});

test("detail freshness avoids a duplicate empty confirmation state", async ({
  page,
}) => {
  await page.goto(`/tips/${unconfirmedTipId}`);

  const freshness = page.locator(".freshness-panel");
  await expect(freshness.getByText("Not yet confirmed")).toBeVisible();
  await expect(freshness.getByText("No confirmations yet")).toHaveCount(0);
  await expect(freshness.locator(".fresh-count")).toHaveCount(0);
});

test("detail distinguishes when a tip was added from when it was edited", async ({
  page,
}) => {
  await page.goto(`/tips/${changedTipId}`);
  await expect(page.locator(".last-confirmed time")).toHaveAttribute(
    "datetime",
    new Date("2026-09-06T06:30:00.000Z").toISOString(),
  );
  const confirmationTooltipTrigger = page.getByRole("button", {
    name: "About Last confirmed",
  });
  await confirmationTooltipTrigger.click();
  const confirmationTooltip = page.getByRole("tooltip");
  await expect(confirmationTooltip).toContainText(
    "Confirmations apply only to the version they reviewed",
  );
  const [triggerBox, tooltipBox] = await Promise.all([
    confirmationTooltipTrigger.boundingBox(),
    confirmationTooltip.boundingBox(),
  ]);
  expect(tooltipBox?.x).toBeGreaterThanOrEqual(
    (triggerBox?.x ?? 0) + (triggerBox?.width ?? 0),
  );

  await page.goto(`/tips/${unconfirmedTipId}`);
  await expect(page.locator(".tip-activity .fresh-label")).toContainText(
    "Added",
  );
  await expect(page.locator(".tip-activity time")).toHaveAttribute(
    "datetime",
    /.+/,
  );
  await page.goto(`/tips/${editedTipId}`);
  await expect(page.locator(".tip-activity .fresh-label")).toContainText(
    "Last updated",
  );
  await page.getByRole("button", { name: "About Last updated" }).click();
  await expect(page.getByRole("tooltip")).toHaveText(
    "When the original author last edited this tip.",
  );
});

test("an author can open an edit form with the tip details populated", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${unconfirmedTipId}`);

  const editLink = page.getByRole("link", { name: "Edit your tip" });
  await expect(editLink).toHaveAttribute(
    "href",
    `/tips/${unconfirmedTipId}/edit`,
  );
  await editLink.click();

  await expect(page).toHaveURL(`/tips/${unconfirmedTipId}/edit`);
  await expect(
    page.getByRole("heading", { name: "Edit your tip" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", {
      name: "What should someone know before staying here?",
    }),
  ).toHaveValue(/paid ₹650 for a private room/);
  await expect(
    page.getByRole("combobox", { name: "When were you there?" }),
  ).toHaveValue("2026-08");
  await expect(
    page.getByRole("textbox", { name: "What did you pay?" }),
  ).toHaveValue("650");
  await expect(
    page.getByRole("textbox", { name: "Where did you stay?" }),
  ).toHaveValue("ABC Lodge");
});

test("guest reaction returns to a focused intent without voting", async ({
  page,
}) => {
  await page.goto(`/tips/${changedTipId}`);
  await page.getByRole("button", { name: "Still accurate" }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  expect(decodeURIComponent(page.url())).toContain(
    `/tips/${changedTipId}?intent=confirm`,
  );

  await signInAsObserver(page);
  await page.goto(`/tips/${changedTipId}?intent=confirm`);
  await expect(page.getByRole("button", { name: "Confirmed" })).toBeFocused();
  await expect(page.locator(".reaction-count")).toContainText(
    "7 travellers confirmed this version",
  );
});

test("signed-in traveller can confirm, correct the month, undo, and mark helpful", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${changedTipId}`);

  await page.getByRole("button", { name: "Still accurate" }).click();
  await expect(page.getByText(/Confirmed for September 2026/)).toBeVisible();
  await expect(page.locator(".reaction-count")).toContainText(
    "8 travellers confirmed this version",
  );
  await expect(page.locator(".detail-main .badge")).toContainText(
    "Change reported",
  );
  await page.getByLabel("Change month").fill("2026-08");
  await page.getByRole("button", { name: "Save month" }).click();
  await expect(page.getByText(/Confirmed for August 2026/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByRole("button", { name: "Still accurate" }),
  ).toBeVisible();
  await expect(page.locator(".reaction-count")).toContainText(
    "7 travellers confirmed this version",
  );

  const helpful = page.getByRole("button", { name: "Helpful 0" });
  await helpful.click();
  await expect(page.getByRole("button", { name: "Helpful 1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/tips/${changedTipId}`),
    ),
    page.getByRole("button", { name: "Helpful 1" }).click(),
  ]);
  await expect(page.getByRole("button", { name: "Helpful 0" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByText("Removed your helpful mark.")).toHaveText(
    "Removed your helpful mark.",
  );
});

test("optimistic reaction state rolls back after a transport failure", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${changedTipId}`);
  await page.route("**/tips/**", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Helpful 0" }).click();
  await expect(page.locator(".reaction-region .field-error")).toContainText(
    "Helpful could not be updated. Your previous choice is unchanged.",
  );
  await expect(page.getByRole("button", { name: "Helpful 0" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("copy link reports success or selects the canonical fallback", async ({
  page,
}) => {
  await page.goto(`/tips/${changedTipId}?intent=helpful`);
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Copy tip link" }).click();
  await expect(page.getByRole("status")).toContainText(
    /Link copied|Copy unavailable\. The link is selected\./,
  );
  const fallback = page.getByRole("textbox", { name: "Canonical tip link" });
  if (await fallback.count())
    await expect(fallback).toHaveValue(
      `http://127.0.0.1:3100/tips/${changedTipId}`,
    );
});

test("changed-information composer locks context and retains a guest draft", async ({
  page,
}) => {
  await page.goto(`/tips/${changedTipId}/update`);
  await expect(
    page.getByRole("heading", { name: "What has changed?" }),
  ).toBeVisible();
  await expect(page.getByText("Original report · version 1")).toBeVisible();
  await expect(page.locator(".original-summary")).toContainText("₹35");
  await expect(
    page.getByRole("button", { name: /General|Transport/ }),
  ).toHaveCount(0);
  const body = page.getByRole("textbox", {
    name: "Tell travellers what's different",
  });
  const update =
    "The September bus fare was ₹45 and the journey took forty minutes.";
  await body.fill(update);
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Share update" }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await page.goBack();
  await expect(body).toHaveValue(update);
});

test("signed-in traveller publishes an attributed update without replacing the original", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${changedTipId}/update`);
  const update =
    "Fictional browser check: the bus fare was ₹45 in September; the original report should remain visible.";
  await page
    .getByRole("textbox", { name: "Tell travellers what's different" })
    .fill(update);
  await page.getByRole("button", { name: "Share update" }).click();
  await expect(
    page.getByRole("heading", { name: "Update shared" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View updated discussion" }).click();
  await expect(page.locator(".detail-main > .price")).toContainText("₹35");
  await expect(page.getByText(update)).toBeVisible();
});

for (const path of [
  "/",
  "/destinations/badami",
  "/destinations/badami/add",
  `/tips/${changedTipId}`,
  "/sign-in",
]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );
    expect(serious).toEqual([]);
  });
}
