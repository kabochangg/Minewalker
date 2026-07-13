import { expect, test } from "@playwright/test";

interface ExplorationE2EBridge {
  mineWall(): void;
  coolMine(): void;
  mineTreatedMine(): void;
  reachExit(): void;
  snapshot(): { usedCapacity: number; cleared: boolean; message: string };
}

async function clickGamePoint(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
): Promise<void> {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Expected visible game canvas");
  await page.mouse.click(
    box.x + (x / 390) * box.width,
    box.y + (y / 844) * box.height,
  );
}

async function openFreshTitle(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await clickGamePoint(page, 195, 548);
  await page.waitForTimeout(200);
}

test("title to exploration smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  const canvas = page.locator("canvas");

  await page.mouse.click(195, 570);
  await page.waitForTimeout(200);
  await page.mouse.click(288, 172);
  await page.waitForTimeout(200);
  await page.mouse.click(234, 790);
  await page.waitForTimeout(300);

  await expect(canvas).toBeVisible();
  await page.mouse.click(179, 650);
  await page.mouse.click(43, 772);
  await page.mouse.click(211, 394);
  await page.waitForTimeout(200);

  const screenshot = await page.screenshot();
  expect(screenshot.length).toBeGreaterThan(10_000);
});

test("in-game menu can return to home", async ({ page }) => {
  await openFreshTitle(page);
  await page.mouse.click(195, 570);
  await page.mouse.click(288, 172);
  await page.mouse.click(234, 790);
  await page.waitForTimeout(300);

  await page.mouse.click(360, 104);
  await page.waitForTimeout(100);
  await page.mouse.click(195, 405);
  await page.waitForTimeout(200);

  await expect(page.locator("canvas")).toBeVisible();
});

test("complete exploration loop mines, treats a mine, gains an item, exits, and returns home", async ({
  page,
}) => {
  await page.goto("/?e2e=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);

  const snapshots = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    bridge.mineWall();
    const afterWall = bridge.snapshot();
    bridge.coolMine();
    const afterCooling = bridge.snapshot();
    bridge.mineTreatedMine();
    const afterMine = bridge.snapshot();
    bridge.reachExit();
    const afterExit = bridge.snapshot();
    return { afterWall, afterCooling, afterMine, afterExit };
  });

  expect(snapshots.afterWall.message).toContain("入手");
  expect(snapshots.afterCooling.message).toContain("冷却");
  expect(snapshots.afterMine.usedCapacity).toBeGreaterThan(
    snapshots.afterWall.usedCapacity,
  );
  expect(snapshots.afterExit.cleared).toBe(true);
  await page.waitForTimeout(800);
  await clickGamePoint(page, 118, 720);
  await expect(page.locator("canvas")).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("minewalker.save.v2"),
  );
  expect(saved).toContain('"clears":1');
});

test("virtual joystick moves continuously in a diagonal direction", async ({
  page,
}) => {
  await openFreshTitle(page);
  await clickGamePoint(page, 195, 570);
  await clickGamePoint(page, 288, 172);
  await clickGamePoint(page, 234, 790);
  await page.waitForTimeout(300);

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Expected visible game canvas");
  }
  const toPagePoint = (x: number, y: number) => ({
    x: box.x + (x / 390) * box.width,
    y: box.y + (y / 844) * box.height,
  });
  const center = toPagePoint(68, 770);
  const downRight = toPagePoint(108, 810);
  const before = await page.screenshot();

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(downRight.x, downRight.y, { steps: 4 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(250);

  const after = await page.screenshot();
  expect(after.equals(before)).toBe(false);
  await expect(canvas).toBeVisible();
});

test("settings survive reload smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  await page.mouse.click(308, 684);
  await page.waitForTimeout(100);
  await page.mouse.click(195, 220);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
});

test("production shell remains available offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => "serviceWorker" in navigator);
  await page.waitForTimeout(1_000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
});
