import * as sprites from "./sprites.json";
import * as fx from "./fx";
import { Damage, Death, GameObject } from "./game";
import { clamp, distance, randomFloat, randomInt } from "./helpers";
import { Corpse, Spell, Skeleton } from "./objects";
import { applySpellKinematics, createSpellKinematics, getSpellShotAngle } from "./projectile";
import { CORPSE, MOBILE } from "./tags";

export function Damage(
  object: GameObject,
  amount: number,
  dealer?: GameObject,
) {
  let damage: Damage = { amount, dealer };
  object.onDamage(damage);
  object.hp = clamp(object.hp - damage.amount, 0, object.maxHp);
  if (!object.hp) Die(object, dealer);
}

export function Die(object: GameObject, killer?: GameObject) {
  let death: Death = {
    object,
    killer,
    souls: object.souls,
  };

  if (object.is(MOBILE)) {
    let center = object.center();

    fx
      .bones()
      .extend(center)
      .burst(2 + randomInt(3))
      .remove();

    for (let ritual of game.rituals) {
      ritual.onDeath?.(death);
    }

    if (randomFloat() <= object.corpseChance) {
      game.spawn(Corpse(), center.x, center.y);
    }

    game.addSouls(death.souls);
  }

  object.onDeath(death);

  game.despawn(object);
}

let castAnimationTimeout = 0;
let castGroupId = 1;

export function resetActions() {
  clearTimeout(castAnimationTimeout);
  castGroupId = 1;
}

export function Cast() {
  let { spell, player } = game;

  if (spell.casts === 0) {
    game.showNotice("法术充能中", 900);
    return;
  }
  spell.casts--;

  player.sprite = sprites.norman_arms_up;
  clearTimeout(castAnimationTimeout);
  castAnimationTimeout = setTimeout(() => player.sprite = sprites.norman_arms_down, 500);

  let groupId = castGroupId++;

  for (let j = 0; j < spell.shotsPerRound; j++) {
    let projectile = Spell();
    applySpellKinematics(
      projectile,
      createSpellKinematics(
        spell,
        game.getCastingPoint(),
        getSpellShotAngle(spell, j),
        projectile.sprite,
      ),
    );
    projectile.groupId = groupId;
    game.spawn(projectile);
    game.onCast(projectile);
  }
}

export function Resurrect() {
  if (game.ability.timer < game.ability.cooldown) {
    game.showNotice("复活冷却中", 900);
    return;
  }

  let playerCenter = game.player.center();
  let corpses = game.objects
    .filter(object => object.is(CORPSE))
    .sort((a, b) => distance(a.center(), playerCenter) - distance(b.center(), playerCenter))
    .slice(0, game.ability.resurrectionCount);

  if (!corpses.length) {
    game.showNotice("没有可复活的尸骨", 900);
    return;
  }

  game.ability.timer = 0;
  game.showNotice(`复活 ${corpses.length} 具尸骨`, 1100);

  for (let ritual of game.rituals) {
    ritual.onResurrect?.();
  }

  for (let corpse of corpses) {
    game.despawn(corpse);

    let unit = Skeleton();
    game.spawn(unit, corpse.x, 0);
    fx.resurrect(unit).burst(10).remove();

    for (let ritual of game.rituals) {
      ritual.onResurrection?.(unit);
    }
  }
}
