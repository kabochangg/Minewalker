import { expect, test } from "@playwright/test";

type E2EDirection =
  | "up"
  | "upRight"
  | "right"
  | "downRight"
  | "down"
  | "downLeft"
  | "left"
  | "upLeft";

interface ExplorationE2EBridge {
  mineWall(): void;
  coolMine(): void;
  mineTreatedMine(): void;
  reachExit(): void;
  inputDirection(direction: E2EDirection): void;
  showResult(): void;
  snapshot(): {
    usedCapacity: number;
    cleared: boolean;
    message: string;
    facing: string;
  };
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
  await page.waitForTimeout(250);
  await clickGamePoint(page, 195, 548);
  await page.waitForTimeout(200);
}

async function dismissPwaNotice(
  page: import("@playwright/test").Page,
): Promise<void> {
  const close = page.locator(".pwa-notice button");
  try {
    await close.click({ timeout: 1_500 });
  } catch {
    // The notice appears only after the service worker finishes caching.
  }
}

test("title to exploration smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  await dismissPwaNotice(page);
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
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("minewalker.save.v2");
    if (!raw) return false;
    const saved = JSON.parse(raw) as { statistics?: { clears?: number } };
    return saved.statistics?.clears === 1;
  });
  await clickGamePoint(page, 118, 720);
  await expect(page.locator("canvas")).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("minewalker.save.v2"),
  );
  expect(saved).toContain('"clears":1');
});

test("virtual joystick reports all eight movement directions", async ({
  page,
}) => {
  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);

  const directions = [
    "up",
    "upRight",
    "right",
    "downRight",
    "down",
    "downLeft",
    "left",
    "upLeft",
  ] as const;
  for (const expected of directions) {
    const facing = await page.evaluate((direction) => {
      const bridge = (
        window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
      ).__minewalkerE2E;
      bridge.inputDirection(direction);
      return bridge.snapshot().facing;
    }, expected);
    expect(facing).toBe(expected);
    await page.waitForTimeout(220);
  }
  await expect(page.locator("canvas")).toBeVisible();
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

test("visual baseline fits and captures the five primary screens", async ({
  page,
}, testInfo) => {
  await openFreshTitle(page);
  await dismissPwaNotice(page);
  const canvas = page.locator("canvas");
  const viewport = page.viewportSize();
  const box = await canvas.boundingBox();
  if (!box || !viewport) throw new Error("Expected canvas and viewport bounds");
  expect(box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("title.png") });

  await clickGamePoint(page, 82, 684);
  await page.waitForTimeout(100);
  await page.screenshot({ path: testInfo.outputPath("home.png") });
  await clickGamePoint(page, 195, 602);
  await page.waitForTimeout(100);
  await page.screenshot({ path: testInfo.outputPath("area-select.png") });

  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);
  await dismissPwaNotice(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath("exploration.png") });
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E.showResult();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath("result.png") });
});
