import { expect, test } from "@playwright/test";

async function createHero(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill(name);
  await page.locator('[data-action="create-character"]').click();
  // The intro pages appear only once the world has loaded, and one press finishes a page's
  // typing while a second turns the page.
  // Both presses go straight to the button inside the page, never through a real pointer: a real
  // click waits for the button to hold perfectly still, and one that a closing page removes
  // mid-press can wait for ever, which is what made this hang on the build machine.
  const intro = page.locator(".story-box");
  await expect(intro.first()).toBeVisible({ timeout: 20000 });
  for (let i = 0; i < 60; i += 1) {
    const pressed = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>(".story-box button");
      if (!button) return false;
      button.click();
      return true;
    });
    if (!pressed) break;
    await page.waitForTimeout(120);
  }
  await expect(intro).toHaveCount(0);
  await expect(page.locator("#hud")).toBeVisible();
  await page.locator("#tutorial-close").click();
}

test("a new hero starts with the first quest in the quest panel", async ({ page }) => {
  await createHero(page, "Quest Hero");

  await page.keyboard.press("q");
  await expect(page.locator("#overlay")).toContainText("Quest");
  await page.keyboard.press("Escape");
});

test("a created hero is still there after a reload", async ({ page }) => {
  await createHero(page, "Saved Hero");
  // Give autosave a moment to write to IndexedDB before reloading.
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Realm of Legends" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Saved Hero");
});

test("the attack button fires without errors during combat", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await createHero(page, "Combat Hero");
  await page.locator('[data-panel="settings"]').click();
  await page.locator("#touch-toggle").check();
  await page.locator('[data-action="close-panel"]').click();

  const attack = page.locator('[data-touch="attack"]');
  await expect(attack).toBeVisible();
  await attack.dispatchEvent("pointerdown");
  await attack.dispatchEvent("pointerup");
  await page.waitForTimeout(500);

  await expect(page.locator("#hud")).toBeVisible();
  expect(errors).toEqual([]);
});
