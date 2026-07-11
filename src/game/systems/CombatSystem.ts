import type { MonsterDefinition } from "../../data/monsters";
import type { PlayerState } from "../entities/player";
import { damagePlayer } from "../entities/player";

export interface CombatantState {
  readonly hp: number;
  readonly maxHp: number;
}

export interface AttackResult {
  readonly player: PlayerState;
  readonly monster: CombatantState;
  readonly message: string;
  readonly defeated: boolean;
}

export function attackMonster(
  player: PlayerState,
  monsterDefinition: MonsterDefinition,
  monster: CombatantState
): AttackResult {
  const damage = Math.max(1, player.attack - monsterDefinition.defense);
  const hp = Math.max(0, monster.hp - damage);
  return {
    player: { ...player, actionState: "attacking" },
    monster: { ...monster, hp },
    message: hp === 0 ? `${monsterDefinition.name}を倒しました` : `${damage}ダメージ`,
    defeated: hp === 0
  };
}

export function monsterAttack(
  player: PlayerState,
  monsterDefinition: MonsterDefinition
): PlayerState {
  return damagePlayer(player, Math.max(1, monsterDefinition.attack - player.defense));
}
