import { expect, test } from "@playwright/test";

/**
 * The new-hero intro pages cover the screen, so clear them before touching anything else.
 * Two catches: the pages appear only once the world has loaded, and one press finishes a page's
 * typing while a second press turns the page.
 * Both presses go straight to the button inside the page, never through a real pointer: a real
 * click waits for the button to hold perfectly still, and one that a closing page removes mid-press
 * can wait for ever, which is what made this hang on the build machine.
 */
async function skipIntro(page: import("@playwright/test").Page) {
  const box = page.locator(".story-box");
  await expect(box.first()).toBeVisible({ timeout: 20000 });
  for (let i = 0; i < 60; i += 1) {
    const pressed = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>(".story-box .story-continue");
      if (!button) return false;
      button.click();
      return true;
    });
    if (!pressed) break;
    await page.waitForTimeout(120);
  }
  await expect(box).toHaveCount(0);
}

test("loads, creates a hero, and opens the core panels", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Realm of Legends" })).toBeVisible();
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("E2E Hero");
  await page.locator('[data-action="create-character"]').click();
  await skipIntro(page);

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
  await page.locator("#brightness-select").selectOption("1.4");
  await expect(page.locator("#game canvas")).toHaveCSS("filter", "brightness(1.4)");
  await page.locator("#contrast-toggle").check();
  await expect(page.locator("#game canvas")).toHaveCSS("filter", "brightness(1.4) contrast(1.18)");
  await page.locator("#motion-toggle").check();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
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
  await skipIntro(page);
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
  await skipIntro(page);

  await expect(page.locator("#overlay")).toBeVisible();
  await expect(page.locator("#overlay")).toContainText("Settings");
});

test("enables touch controls for touch-capable players", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Touch Hero");
  await page.locator('[data-action="create-character"]').click();
  await skipIntro(page);
  await page.locator("#tutorial-close").click();

  await page.locator('[data-panel="settings"]').click();
  await page.locator("#touch-toggle").check();
  await page.locator('[data-action="close-panel"]').click();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await expect(page.locator("#touch-stick")).toBeVisible();
  await page.locator('[data-touch="attack"]').dispatchEvent("pointerdown");
});

test("class browsing filters correctly and stays within a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();

  const search = page.locator("[data-class-search]");
  await expect(search).toBeVisible();
  await search.fill("necromancer");
  await expect(page.locator('.class-card[data-class="necromancer"]')).toHaveCount(1);
  await expect(page.locator(".class-card")).toHaveCount(1);

  await search.fill("stormcaller");
  const stormcaller = page.locator('.class-card[data-class="stormcaller"]');
  await expect(stormcaller).toBeVisible();
  await expect(page.locator(".class-card")).toHaveCount(1);
  await stormcaller.click();
  await expect(stormcaller).toHaveAttribute("aria-pressed", "true");

  await search.fill("no matching class");
  await expect(page.locator(".class-listing .empty-state")).toBeVisible();
  await search.fill("");
  const magicFilter = page.locator('[data-action="class-role-filter"][data-value="magic"]');
  await magicFilter.click();
  await expect(magicFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.class-card[data-class="mage"]')).toBeVisible();

  const hasHorizontalOverflow = await page.locator("#char-select").evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("minimap toggle updates its visibility and accessible state", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Map Hero");
  await page.locator('[data-action="create-character"]').click();
  await skipIntro(page);
  await page.locator("#tutorial-close").click();

  const toggle = page.locator("#minimap-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-label", "Show minimap");
  await expect(page.locator("#minimap")).toBeHidden();
  await toggle.click();
  await expect(page.locator("#minimap")).toBeVisible();
});

test("journal navigation and modal keyboard focus are accessible", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill("Focus Hero");
  await page.locator('[data-action="create-character"]').click();
  await skipIntro(page);
  await page.locator("#tutorial-close").click();

  await page.locator('[data-panel="quests"]').click();
  await expect(page.getByRole("navigation", { name: "Journal sections" })).toBeVisible();
  await page.getByRole("link", { name: "World lore" }).click();
  await expect(page).toHaveURL(/#journal-lore$/);
  await page.keyboard.press("Escape");

  const settings = page.locator('[data-panel="settings"]');
  await settings.click();
  await expect(page.locator(".panel-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator('[data-action="delete-current"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  await expect(page.locator("#overlay")).toHaveAttribute("aria-hidden", "true");
});
