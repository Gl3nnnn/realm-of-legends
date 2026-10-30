import { expect, test } from "@playwright/test";

async function createHero(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.locator('[data-action="new-character"]').click();
  await page.locator("#char-name").fill(name);
  await page.locator('[data-action="create-character"]').click();
  // The intro pages appear only once the world has loaded, and one press finishes a page's
  // typing while a second turns the page, so press until the box is gone.
  const intro = page.locator(".story-box");
  await expect(intro.first()).toBeVisible({ timeout: 20000 });
  for (let i = 0; i < 24 && (await intro.count()) > 0; i += 1) {
    // Press rather than click: a press ignores the 20ms of typing that keeps nudging the column,
    // while a click waits for the button to hold perfectly still and can wait for ever.
    await intro.first().locator("button").press("Enter");
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
