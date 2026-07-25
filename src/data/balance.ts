export const BALANCE = {
  presentation: {
    tileSize: 48,
    fixedStepMs: 1_000 / 60,
    maxCatchUpSteps: 3,
    chunkSize: 8,
    chunkOverscanTiles: 2,
  },
  persistence: {
    saveCoalesceMs: 250,
  },
  player: {
    maxHp: 100,
    maxStamina: 50,
    attack: 10,
    defense: 3,
    bagCapacity: 30,
  },
  mining: {
    normalWallCost: 1,
    hardWallCost: 2,
    staminaCost: 1,
    initialCoolants: 3,
    initialDisablers: 2,
    initialPotions: 3,
  },
  mine: {
    normalDamage: 25,
    chainRadius: 1,
    treatedDropMultiplier: 1.5,
  },
  combat: {
    playerAttackCooldownMs: 550,
    monsterAttackCooldownMs: 1_200,
    staminaCost: 2,
  },
  stamina: {
    walkCostPerSecond: 0,
    runCostPerSecond: 5,
    recoveryPerSecond: 4,
  },
  hazard: {
    disposalStaminaCost: 2,
  },
  tool: {
    baseDurability: 20,
    durabilityPerTier: 10,
    repairCoinPerPoint: 2,
    upgradeCoinBase: 80,
  },
} as const;
