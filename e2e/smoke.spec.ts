import { expect, test } from "@playwright/test";

test("loads, creates a hero, and opens the core panels", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Realm of Legends" })).toBeVisible();
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("E2E Hero");
  await page.locator('[data-action="create-character"]').click();

  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#hud-zone")).toHaveText("Eldoria Village");
  await expect(page.locator("#hud-cycle")).toHaveText("Normal");
  await expect(page.locator("#tutorial")).toBeVisible();
  await page.locator("#tutorial-close").click();
  await expect(page.locator("#tutorial")).toBeHidden();

  await page.locator('[data-panel="settings"]').click();
  await expect(page.locator("#difficulty-select")).toBeVisible();
  await page.locator("#difficulty-select").selectOption("nightmare");
  await expect(page.locator("#hud-cycle")).toHaveText("Nightmare");
  await page.locator('[data-action="close-panel"]').click();

  await page.keyboard.press("i");
  await expect(page.locator("#overlay")).toBeVisible();
  await expect(page.locator("#overlay")).toContainText("Backpack");
  await page.keyboard.press("Escape");

  await page.keyboard.press("q");
  await expect(page.locator("#overlay")).toContainText("Quest");
  await page.keyboard.press("Escape");

  await expect(page.locator("canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("rebinds and restores keys from settings", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Bind Hero");
  await page.locator('[data-action="create-character"]').click();
  await page.locator("#tutorial-close").click();
  await page.locator('[data-panel="settings"]').click();

  const quick1 = page.locator('[data-action="rebind-key"][data-key="quick1"]');
  await expect(quick1).toContainText("Z");
  await quick1.click();
  await expect(quick1).toContainText("Press a key");
  await page.keyboard.press("y");
  await expect(quick1).toContainText("Y");

  await page.locator('[data-action="reset-keys"]').click();
  await expect(quick1).toContainText("Z");
});

test("opens settings from a gamepad Start press", async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    buttons[9] = { pressed: true, touched: true, value: 1 };
    const pad = { connected: true, id: "Playwright Pad", index: 0, mapping: "standard", axes: [0, 0, 0, 0], buttons, timestamp: Date.now() };
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad], configurable: true });
  });

  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Pad Hero");
  await page.locator('[data-action="create-character"]').click();

  await expect(page.locator("#overlay")).toBeVisible();
  await expect(page.locator("#overlay")).toContainText("Settings");
});

test("enables touch controls for touch-capable players", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Touch Hero");
  await page.locator('[data-action="create-character"]').click();
  await page.locator("#tutorial-close").click();

  await page.locator('[data-panel="settings"]').click();
  await page.locator("#touch-toggle").check();
  await page.locator('[data-action="close-panel"]').click();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await expect(page.locator("#touch-stick")).toBeVisible();
  await page.locator('[data-touch="attack"]').dispatchEvent("pointerdown");
});
