import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

test.describe.configure({ mode: "serial" });

const changedTipId = "00000000-0000-4000-8000-000000000102";
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
  { width: 1440, height: 1000 },
]) {
  test(`core public pages fit at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const path of [
      "/",
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

test("guest composer validates first, preserves its draft, and returns from sign-in", async ({
  page,
}) => {
  await page.goto("/destinations/badami/add");
  const body = page.getByRole("textbox", {
    name: "What should the next traveler know?",
  });

  await body.fill("short");
  await page.getByRole("button", { name: "Share tip" }).click();
  await expect(
    page.getByText("Review the highlighted fields and try again."),
  ).toBeVisible();

  const usefulTip = "The north bus stand ticket counter opens before seven.";
  await body.fill(usefulTip);
  await page.getByRole("button", { name: "Share tip" }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByText("Your tip is saved in this tab.")).toBeVisible();

  await page.goBack();
  await expect(body).toHaveValue(usefulTip);
  await expect(page.getByText("Your saved draft was restored.")).toBeVisible();
});

test("guest photo selection asks for sign-in before opening a file picker", async ({
  page,
}) => {
  await page.goto("/destinations/badami/add");
  await page
    .getByRole("textbox", { name: "What should the next traveler know?" })
    .fill("A draft remains available before choosing any photos.");
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
    page.getByText("7 travelers confirmed this version"),
  ).toHaveCount(2);
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
    "7 travelers confirmed this version",
  );
});

test("signed-in traveler can confirm, correct the month, undo, and mark helpful", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${changedTipId}`);

  await page.getByRole("button", { name: "Still accurate" }).click();
  await expect(page.getByText(/Confirmed for September 2026/)).toBeVisible();
  await expect(page.locator(".reaction-count")).toContainText(
    "8 travelers confirmed this version",
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
    "7 travelers confirmed this version",
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
  await page.getByRole("button", { name: "Copy link" }).click();
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
    page.getByRole("button", { name: /Quick tip|Transport/ }),
  ).toHaveCount(0);
  const body = page.getByRole("textbox", {
    name: "Tell travelers what's different",
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

test("signed-in traveler publishes an attributed update without replacing the original", async ({
  page,
}) => {
  await signInAsObserver(page, newObserverSessionToken);
  await page.goto(`/tips/${changedTipId}/update`);
  const update =
    "Fictional browser check: the bus fare was ₹45 in September; the original report should remain visible.";
  await page
    .getByRole("textbox", { name: "Tell travelers what's different" })
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
