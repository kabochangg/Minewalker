export const BALANCE = {
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
  },
} as const;
