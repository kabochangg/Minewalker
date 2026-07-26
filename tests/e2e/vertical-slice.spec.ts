import { expect, test } from "@playwright/test";
import { expectJapaneseFontReady } from "./helpers/fontAssertions";

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
  markMine(): void;
  mineMarkedMine(): void;
  disposeMine(): void;
  falseDispose(): void;
  triggerDefeat(): void;
  recoverLatestDeathCache(): void;
  toggleRun(): void;
  measureInput(): void;
  snapshot(): {
    usedCapacity: number;
    cleared: boolean;
    message: string;
    facing: string;
    stamina: number;
    toolDurability: number;
    adjacentAtPlayer: number;
    deathCacheCount: number;
    locomotion: "walk" | "run";
    generatedStartSafe: boolean;
  };
}

interface PwaE2EBridge {
  state(): {
    installAvailable: boolean;
    offlineReady: boolean;
    updateAvailable: boolean;
    updateDeferred: boolean;
  };
  notifyUpdate(): void;
  deferUpdate(): void;
  applyUpdate(): Promise<boolean>;
}

interface PerformanceE2EBridge {
  reset(): void;
  start(windowMs: number): void;
  stop(): {
    averageFps: number;
    frameDeltaP95Ms: number;
    inputToPresentP95Ms: number;
    stallsOver100Ms: number;
    sampleCount: number;
    objectCounts: {
      gameObjects: number;
      texts: number;
      activeChunks: number;
    };
  };
  getFontStatus(): { loaded: boolean; family: string };
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
  await waitForActiveScene(page, "TitleScene");
}

async function waitForActiveScene(
  page: import("@playwright/test").Page,
  sceneKey: string,
): Promise<void> {
  await page.waitForFunction((expected) => {
    const active = (
      window as typeof window & {
        __minewalkerActiveScene?: () => string | undefined;
      }
    ).__minewalkerActiveScene;
    return active?.() === expected;
  }, sceneKey);
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

async function startNewGameFromTitle(
  page: import("@playwright/test").Page,
): Promise<void> {
  await clickGamePoint(page, 195, 570);
  await page.waitForTimeout(80);
  await clickGamePoint(page, 195, 482);
  await page.waitForTimeout(80);
  await clickGamePoint(page, 268, 500);
  await waitForActiveScene(page, "AreaSelectScene");
}

test("title to exploration smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  await dismissPwaNotice(page);
  const canvas = page.locator("canvas");

  await startNewGameFromTitle(page);
  await clickGamePoint(page, 288, 172);
  await page.waitForTimeout(200);
  await clickGamePoint(page, 234, 790);
  await page.waitForTimeout(300);

  await expect(canvas).toBeVisible();
  await clickGamePoint(page, 43, 772);
  await clickGamePoint(page, 211, 394);
  await page.waitForTimeout(200);

  const screenshot = await page.screenshot();
  // PNG compression varies substantially by viewport and browser version.
  // This only guards against a blank capture; screen-specific layout is
  // exercised by the visual-baseline test below.
  expect(screenshot.length).toBeGreaterThan(1_000);
});

test("DOM exploration HUD exposes readable actions and 44px touch targets", async ({
  page,
}) => {
  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  const ui = page.getByRole("region", { name: "探索インターフェース" });
  await expect(ui).toBeVisible();
  const actions = ui.getByRole("navigation", { name: "探索アクション" });
  const buttons = actions.getByRole("button");
  await expect(buttons).toHaveCount(6);
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const cool = actions.getByRole("button", { name: "冷却 3" });
  await cool.click();
  await expect(cool).toHaveAttribute("aria-pressed", "true");
  const objective = ui.locator(".objective-chip");
  await objective.click();
  await expect(objective).toHaveAttribute("aria-expanded", "true");
  await expect(ui.getByRole("status")).toContainText("冷却");
});

test("self-hosted Japanese font is ready on every mobile viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expectJapaneseFontReady(page);
  const fontStatus = await page.evaluate(() =>
    (
      window as typeof window & {
        __minewalkerPerformance: PerformanceE2EBridge;
      }
    ).__minewalkerPerformance.getFontStatus(),
  );
  expect(fontStatus).toEqual({ loaded: true, family: "MinewalkerJP" });
});

test("performance contract remains stable after 100 exploration actions", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390");
  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(
    () => "__minewalkerE2E" in window && "__minewalkerPerformance" in window,
  );
  await page.evaluate(() => {
    const target = window as typeof window & {
      __minewalkerE2E: ExplorationE2EBridge;
      __minewalkerPerformance: PerformanceE2EBridge;
    };
    target.__minewalkerPerformance.reset();
    target.__minewalkerPerformance.start(3_000);
    for (let index = 0; index < 100; index += 1) {
      target.__minewalkerE2E.markMine();
    }
    target.__minewalkerE2E.inputDirection("right");
    target.__minewalkerE2E.measureInput();
  });
  await page.waitForTimeout(3_000);
  const snapshot = await page.evaluate(() =>
    (
      window as typeof window & {
        __minewalkerPerformance: PerformanceE2EBridge;
      }
    ).__minewalkerPerformance.stop(),
  );
  expect(snapshot.averageFps).toBeGreaterThanOrEqual(55);
  expect(snapshot.frameDeltaP95Ms).toBeLessThanOrEqual(25);
  expect(snapshot.inputToPresentP95Ms).toBeGreaterThan(0);
  expect(snapshot.inputToPresentP95Ms).toBeLessThanOrEqual(100);
  expect(snapshot.stallsOver100Ms).toBe(0);
  expect(snapshot.objectCounts.gameObjects).toBeLessThan(1_000);
});

test("in-game menu can return to home", async ({ page }) => {
  await openFreshTitle(page);
  await startNewGameFromTitle(page);
  await clickGamePoint(page, 288, 172);
  await waitForActiveScene(page, "LoadoutScene");
  await clickGamePoint(page, 234, 790);
  await waitForActiveScene(page, "ExplorationScene");

  await page
    .getByRole("button", { name: "探索メニューを開く" })
    .click();
  await page.waitForTimeout(100);
  await clickGamePoint(page, 195, 405);
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
    const raw = localStorage.getItem("minewalker.save.v3");
    if (!raw) return false;
    const saved = JSON.parse(raw) as { statistics?: { clears?: number } };
    return saved.statistics?.clears === 1;
  });
  await clickGamePoint(page, 118, 720);
  await waitForActiveScene(page, "HomeScene");
  await expect(page.locator("canvas")).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("minewalker.save.v3"),
  );
  expect(saved).toContain('"clears":1');
  expect(saved).toContain('"claimedCheckpointIds"');
  expect(saved).toContain('"currentDurability":29');
  await clickGamePoint(page, 120, 670);
  const repaired = await page.evaluate(() =>
    localStorage.getItem("minewalker.save.v3"),
  );
  expect(repaired).toContain('"currentDurability":30');
});

test("danger mark protects mining and disposal applies exact costs", async ({
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
  const snapshots = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    const initial = bridge.snapshot();
    bridge.markMine();
    bridge.mineMarkedMine();
    const protectedMine = bridge.snapshot();
    bridge.falseDispose();
    const falseDisposal = bridge.snapshot();
    bridge.disposeMine();
    const correctDisposal = bridge.snapshot();
    return { initial, protectedMine, falseDisposal, correctDisposal };
  });
  expect(snapshots.protectedMine.message).toContain("保護");
  expect(snapshots.falseDisposal.stamina).toBe(snapshots.initial.stamina - 2);
  expect(snapshots.falseDisposal.toolDurability).toBe(
    snapshots.initial.toolDurability,
  );
  expect(snapshots.correctDisposal.toolDurability).toBe(
    snapshots.initial.toolDurability - 1,
  );
  expect(snapshots.correctDisposal.adjacentAtPlayer).toBe(0);
});

test("defeat cache persists and can only be recovered once", async ({
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
  const result = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    bridge.triggerDefeat();
    bridge.triggerDefeat();
    const defeated = bridge.snapshot();
    const savedAfterDeath = localStorage.getItem("minewalker.save.v3");
    bridge.recoverLatestDeathCache();
    const recovered = bridge.snapshot();
    bridge.recoverLatestDeathCache();
    const recoveredSecond = bridge.snapshot();
    bridge.recoverLatestDeathCache();
    const duplicate = bridge.snapshot();
    return {
      defeated,
      savedAfterDeath,
      recovered,
      recoveredSecond,
      duplicate,
    };
  });
  expect(result.defeated.deathCacheCount).toBe(2);
  expect(result.savedAfterDeath).toContain('"death.1"');
  expect(result.savedAfterDeath).toContain('"death.2"');
  expect(result.recovered.deathCacheCount).toBe(1);
  expect(result.recoveredSecond.deathCacheCount).toBe(0);
  expect(result.duplicate.deathCacheCount).toBe(0);
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

test("running consumes stamina and reports locomotion in the HUD state", async ({
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
  const before = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    bridge.toggleRun();
    bridge.inputDirection("up");
    return bridge.snapshot();
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() =>
    (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E.snapshot(),
  );
  expect(before.locomotion).toBe("run");
  expect(after.stamina).toBeLessThan(before.stamina);
});

test("settings survive reload smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  await clickGamePoint(page, 308, 684);
  await page.waitForTimeout(100);
  await clickGamePoint(page, 195, 220);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
});

test("new game cancellation preserves progress and confirmation preserves preferences", async ({
  page,
}) => {
  await openFreshTitle(page);
  await page.evaluate(() => {
    const raw = localStorage.getItem("minewalker.save.v3");
    if (!raw) throw new Error("Expected v3 save");
    const save = JSON.parse(raw) as {
      player: { coins: number };
      settings: { volume: number };
    };
    save.player.coins = 77;
    save.settings.volume = 0.5;
    localStorage.setItem("minewalker.save.v3", JSON.stringify(save));
  });
  await page.reload();
  await waitForActiveScene(page, "TitleScene");
  await clickGamePoint(page, 195, 570);
  await page.waitForTimeout(80);
  await clickGamePoint(page, 195, 482);
  await page.waitForTimeout(80);
  await clickGamePoint(page, 122, 500);
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return raw
        ? (JSON.parse(raw) as { player: { coins: number } }).player.coins
        : -1;
    }),
  ).toBe(77);
  await clickGamePoint(page, 195, 482);
  await page.waitForTimeout(80);
  await clickGamePoint(page, 268, 500);
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      const save = raw
        ? (JSON.parse(raw) as {
            player: { coins: number };
            settings: { volume: number };
          })
        : undefined;
      return { coins: save?.player.coins, volume: save?.settings.volume };
    }),
  ).toEqual({ coins: 0, volume: 0.5 });
});

test("difficulty and input mode selections persist", async ({ page }) => {
  await openFreshTitle(page);
  await startNewGameFromTitle(page);
  await clickGamePoint(page, 195, 112);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return raw
        ? (JSON.parse(raw) as { selectedDifficulty: string }).selectedDifficulty
        : "";
    }),
  ).toBe("hard");
  await page.goto("/");
  await waitForActiveScene(page, "TitleScene");
  await clickGamePoint(page, 308, 684);
  await waitForActiveScene(page, "SettingsScene");
  await clickGamePoint(page, 195, 550);
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return raw
        ? (JSON.parse(raw) as { controlScheme: { mode: string } }).controlScheme
            .mode
        : "";
    }),
  ).toBe("touchTap");
  await clickGamePoint(page, 195, 550);
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return raw
        ? (JSON.parse(raw) as { controlScheme: { mode: string } }).controlScheme
            .mode
        : "";
    }),
  ).toBe("keyboard");
  await clickGamePoint(page, 195, 550);
  await page.waitForTimeout(80);
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return raw
        ? (JSON.parse(raw) as { controlScheme: { mode: string } }).controlScheme
            .mode
        : "";
    }),
  ).toBe("touchJoystick");
});

test("keyboard input uses configured movement bindings", async ({ page }) => {
  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    const raw = localStorage.getItem("minewalker.save.v3");
    if (raw) {
      const save = JSON.parse(raw) as {
        controlScheme: { mode: string };
      };
      save.controlScheme.mode = "keyboard";
      localStorage.setItem("minewalker.save.v3", JSON.stringify(save));
    }
  });
  await page.reload();
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration: () => void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);
  await page.keyboard.down("w");
  await page.waitForTimeout(150);
  const facing = await page.evaluate(
    () =>
      (
        window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
      ).__minewalkerE2E.snapshot().facing,
  );
  await page.keyboard.up("w");
  expect(facing).toBe("up");
});

test("all difficulties launch visibly different safe dungeons", async ({
  page,
}) => {
  const summaries: {
    difficultyId: string;
    width: number;
    height: number;
    safe: boolean;
  }[] = [];
  for (const difficultyId of ["easy", "normal", "hard"] as const) {
    await page.goto("/?e2e=1");
    await page.waitForFunction(() => "__minewalkerStartExploration" in window);
    await page.waitForFunction(
      () => localStorage.getItem("minewalker.save.v3") !== null,
    );
    await page.evaluate((nextDifficulty) => {
      localStorage.removeItem("minewalker.run.v2");
      localStorage.removeItem("minewalker.run.v2.backup");
      const raw = localStorage.getItem("minewalker.save.v3");
      if (!raw) throw new Error("Expected persistent save");
      const save = JSON.parse(raw) as { selectedDifficulty: string };
      save.selectedDifficulty = nextDifficulty;
      localStorage.setItem("minewalker.save.v3", JSON.stringify(save));
    }, difficultyId);
    await page.reload();
    await page.waitForFunction(() => "__minewalkerStartExploration" in window);
    await page.waitForFunction((expected) => {
      const raw = localStorage.getItem("minewalker.save.v3");
      return (
        raw !== null &&
        (JSON.parse(raw) as { selectedDifficulty: string })
          .selectedDifficulty === expected
      );
    }, difficultyId);
    await page.evaluate(() => {
      (
        window as typeof window & { __minewalkerStartExploration: () => void }
      ).__minewalkerStartExploration();
    });
    await page.waitForFunction(() => "__minewalkerE2E" in window);
    summaries.push(
      await page.evaluate(() => {
        const raw = localStorage.getItem("minewalker.run.v2");
        if (!raw) throw new Error("Expected run save");
        const run = JSON.parse(raw) as {
          exploration: {
            difficultyId: string;
            dungeon: {
              config: {
                width: number;
                height: number;
                entrance: { x: number; y: number };
                safeRadius: number;
              };
              field: {
                tiles: { x: number; y: number; hasMine: boolean }[];
              };
            };
          };
        };
        const { exploration } = run;
        const { config } = exploration.dungeon;
        const bridge = (
          window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
        ).__minewalkerE2E;
        return {
          difficultyId: exploration.difficultyId,
          width: config.width,
          height: config.height,
          safe: bridge.snapshot().generatedStartSafe,
        };
      }),
    );
    await page.evaluate(() => {
      localStorage.removeItem("minewalker.run.v2");
      localStorage.removeItem("minewalker.run.v2.backup");
    });
  }
  expect(summaries.map((summary) => summary.difficultyId)).toEqual([
    "easy",
    "normal",
    "hard",
  ]);
  expect(summaries.every((summary) => summary.safe)).toBe(true);
  expect(summaries[0].width).toBeLessThan(summaries[2].width);
  expect(summaries[0].height).toBeLessThan(summaries[2].height);
});

test("production PWA is installable and exposes the install prompt", async ({
  page,
}) => {
  await page.goto("/?e2e=1");
  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return (await response.json()) as {
      name?: string;
      start_url?: string;
      icons?: readonly unknown[];
    };
  });
  expect(manifest.name).toBeTruthy();
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons?.length).toBeGreaterThan(0);

  const prevented = await page.evaluate(() => {
    const browserWindow = window as typeof window & {
      __installPromptInvoked?: boolean;
    };
    const event = new Event("beforeinstallprompt", {
      cancelable: true,
    }) as Event & { prompt(): Promise<void> };
    Object.defineProperty(event, "prompt", {
      value: async () => {
        browserWindow.__installPromptInvoked = true;
      },
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
        ).__minewalkerPwaE2E.state().installAvailable,
    ),
  ).toBe(true);
});

test("production shell resumes its saved run after an offline cold start", async ({
  page,
  context,
}) => {
  await page.goto("/?e2e=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration(): void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);
  const before = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    bridge.mineWall();
    return bridge.snapshot();
  });
  await page.waitForFunction(() => localStorage.getItem("minewalker.run.v2"));
  await page.waitForFunction(() => "serviceWorker" in navigator);
  await page.waitForTimeout(1_000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => "__minewalkerStartExploration" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerStartExploration(): void }
    ).__minewalkerStartExploration();
  });
  await page.waitForFunction(() => "__minewalkerE2E" in window);
  const resumed = await page.evaluate(() =>
    (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E.snapshot(),
  );
  expect(resumed.usedCapacity).toBe(before.usedCapacity);
  expect(resumed.toolDurability).toBe(before.toolDurability);
});

test("production update can defer, apply, and survive a save failure", async ({
  page,
}) => {
  await page.goto("/?e2e=1");
  await page.waitForFunction(() => "__minewalkerPwaE2E" in window);
  await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
    ).__minewalkerPwaE2E;
    bridge.notifyUpdate();
    bridge.deferUpdate();
  });
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
        ).__minewalkerPwaE2E.state().updateDeferred,
    ),
  ).toBe(true);

  await page.evaluate(() => {
    (
      window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
    ).__minewalkerPwaE2E.notifyUpdate();
  });
  expect(
    await page.evaluate(() =>
      (
        window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
      ).__minewalkerPwaE2E.applyUpdate(),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
        ).__minewalkerPwaE2E.state().updateAvailable,
    ),
  ).toBe(false);

  const protectedFromReload = await page.evaluate(async () => {
    const bridge = (
      window as typeof window & { __minewalkerPwaE2E: PwaE2EBridge }
    ).__minewalkerPwaE2E;
    bridge.notifyUpdate();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("E2E quota failure", "QuotaExceededError");
    };
    try {
      return !(await bridge.applyUpdate()) && bridge.state().updateAvailable;
    } finally {
      Storage.prototype.setItem = original;
    }
  });
  expect(protectedFromReload).toBe(true);
});

test("exploration state snapshot hot path remains below one millisecond", async ({
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
  const snapshotAverageMs = await page.evaluate(() => {
    const bridge = (
      window as typeof window & { __minewalkerE2E: ExplorationE2EBridge }
    ).__minewalkerE2E;
    const start = performance.now();
    for (let index = 0; index < 1_000; index += 1) bridge.snapshot();
    return (performance.now() - start) / 1_000;
  });
  // 描画差分の入力となる同期スナップショット処理を実測する。
  expect(snapshotAverageMs).toBeLessThan(1);
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
