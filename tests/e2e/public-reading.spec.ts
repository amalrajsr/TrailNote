import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

for (const path of [
  "/",
  "/destinations/badami",
  "/destinations/badami/add",
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
