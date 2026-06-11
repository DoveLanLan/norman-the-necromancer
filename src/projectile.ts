import * as sprites from "./sprites.json";
import type { GameObject, Spell } from "./game";
import { clamp, Point, vectorFromAngle } from "./helpers";

export interface ProjectileStage {
  width: number;
  floor: number;
  ceiling: number;
}

export interface ProjectileKinematics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  bounce: number;
  friction: number;
  despawnOnBounce: boolean;
  sprite: number[];
}

export function createSpellKinematics(
  spell: Spell,
  castingPoint: Point,
  angle: number,
  sprite = sprites.p_green_skull,
): ProjectileKinematics {
  let [vx, vy] = vectorFromAngle(angle);
  return {
    x: castingPoint.x - sprite[2] / 2,
    y: castingPoint.y - sprite[3] / 2,
    vx: vx * spell.basePower,
    vy: vy * spell.basePower,
    mass: spell.projectileMass,
    bounce: spell.projectileBounce,
    friction: spell.projectileFriction,
    despawnOnBounce: spell.projectileDespawnOnBounce,
    sprite,
  };
}

export function getSpellShotAngle(spell: Spell, shotIndex: number) {
  return spell.targetAngle
    - (spell.shotsPerRound * spell.shotOffsetAngle / 2)
    + shotIndex * spell.shotOffsetAngle;
}

export function applySpellKinematics(
  object: GameObject,
  kinematics: ProjectileKinematics,
) {
  object.x = kinematics.x;
  object.y = kinematics.y;
  object.vx = kinematics.vx;
  object.vy = kinematics.vy;
  object.mass = kinematics.mass;
  object.bounce = kinematics.bounce;
  object.friction = kinematics.friction;
  object.despawnOnBounce = kinematics.despawnOnBounce;
}

export function stepProjectileKinematics(
  kinematics: ProjectileKinematics,
  stage: ProjectileStage,
  dt: number,
) {
  let d = dt / 1000;

  kinematics.x += kinematics.vx * d;
  kinematics.y += kinematics.vy * d;

  let lower = stage.floor;
  let upper = stage.ceiling - kinematics.sprite[3];

  if (kinematics.y < lower || kinematics.y > upper) {
    kinematics.y = clamp(kinematics.y, lower, upper);

    if (Math.abs(kinematics.vy) >= 10 && kinematics.despawnOnBounce) {
      return false;
    }

    kinematics.vy *= -kinematics.bounce;
  }

  if (kinematics.y === lower || kinematics.y === upper) {
    kinematics.vx *= (1 - kinematics.friction);
  }

  if (kinematics.mass && kinematics.y > 0) {
    kinematics.vy -= kinematics.mass * d;
  }

  return true;
}
