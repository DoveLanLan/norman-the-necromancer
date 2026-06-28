import * as sprites from "./sprites.json";
import { clear, ctx, drawNineSlice, drawSceneSprite, drawSprite, getLogicalSize, measureText, particleEmitters, Sprite, textHeight, write } from "./engine";
import { clamp, Point, randomInt } from "./helpers";
import { GameObject, INTRO, LOSE, PLAYING, SHOPPING, WIN } from "./game";
import { shop } from "./shop";
import { Frozen } from "./behaviours";
import { getSaveState } from "./storage";
import { isMuted } from "./sounds";
import { createSpellKinematics, getSpellShotAngle, stepProjectileKinematics } from "./projectile";
import { CORPSE } from "./tags";
import { LOSE_PANEL, MUTE_BUTTON, RESTART_BUTTON, REVIVE_BUTTON, SHOP_LAYOUT, UiRect } from "./ui";

const ICON_SOULS = "$";
const UI_LIGHT = "#f5ead7";
const UI_DARK = "rgba(24, 22, 34, 0.72)";
const UI_MUTED = "#ff6b7a";
const TRAJECTORY_COLOR = "#8fdc73";
const TRAJECTORY_DOTS = 24;
const TRAJECTORY_STEP_MS = 1000 / 60;
const TRAJECTORY_STEPS_PER_DOT = 4;

let screenShakeTimer = 0;

export function screenshake(time: number) {
  screenShakeTimer = time;
}

let sceneOrigin = Point(0, 150);

export function screenToSceneCoords(x: number, y: number): Point {
  return { x: x | 0, y: sceneOrigin.y - (y | 0) };
}

export function render(dt: number) {
  clear();
  ctx.save();

  if (screenShakeTimer > 0) {
    screenShakeTimer -= dt;
    ctx.translate(randomInt(2), randomInt(2));
  }

  ctx.translate(sceneOrigin.x, sceneOrigin.y);
  drawBackground();
  drawParticles();
  drawObjects();
  if (game.state === PLAYING) {
    drawTrajectory();
    drawReticle();
  }
  ctx.restore();

  drawHud();

  if (game.state === SHOPPING) {
    drawShop();
  }

  if (game.state === LOSE) {
    drawLose();
  }

  if (game.state === WIN) {
    drawWin();
  }

  drawMuteButton();
}

function drawShop() {
  const { width } = getLogicalSize();
  writeCentered("仪式商店", 0, SHOP_LAYOUT.titleY, width);
  let selected = shop.items[shop.selectedIndex];
  for (let i = 0; i < shop.items.length; i++) {
    let item = shop.items[i];
    let row = {
      x: SHOP_LAYOUT.itemX,
      y: SHOP_LAYOUT.itemY + i * SHOP_LAYOUT.rowHeight,
      w: SHOP_LAYOUT.rowWidth,
      h: SHOP_LAYOUT.rowHeightVisual,
    };
    drawShopRow(row, item.name, item.cost ? `$${item.cost}` : "", item === selected);
  }
  let description = selected?.description || "";
  if (selected && selected.cost > game.souls) {
    description = `${description} 魂不足`;
  }
  writeCentered(description, 0, SHOP_LAYOUT.descriptionY, width);
}

function drawHud() {
  const { width } = getLogicalSize();

  if (game.dialogue.length) {
    write(game.dialogue[0], 50, 50);
    const save = getSaveState();
    if (game.state === INTRO && save.highLevel > 1) {
      write(`最高进度 ${save.completed ? "已通关" : save.highLevel + "/10"}`, 145, 170);
    }
  }

  if (game.state === INTRO) return;

  drawSprite(sprites.norman_icon, 0, 0);

  for (let i = 0; i < game.player.maxHp; i++) {
    let sprite = i < game.player.hp ? sprites.health_orb : sprites.health_orb_empty;
    drawSprite(sprite, 11 + i * 4, 0);
  }

  for (let i = 0; i < game.spell.maxCasts; i++) {
    let sprite = i < game.spell.casts ? sprites.cast_orb : sprites.cast_orb_empty;
    drawSprite(sprite, 11 + i * 4, 6);
  }

  let souls = game.souls | 0;
  if (souls) {
    let multiplier = game.getStreakMultiplier();
    let bonus = multiplier ? `(+${multiplier * 100 + "%"})` : "";
    write(`${ICON_SOULS}${souls} ${bonus}`, width / 2 - 30, 0);
  }

  if (game.notice && game.noticeTimer > 0) {
    writeCentered(game.notice, 0, 27, width);
  }

  const levelText = `${game.level+1}-10`;
  write(levelText, MUTE_BUTTON.x - measureText(levelText) - 8, MUTE_BUTTON.y + 6);

  if (game.state === PLAYING) {
    let progress = clamp(game.ability.timer / game.ability.cooldown, 0, 1);
    let corpses = getCorpses();
    drawReviveButton(progress, corpses.slice(0, game.ability.resurrectionCount));
  }
}

function getCorpses() {
  return game.objects.filter(object => object.is(CORPSE));
}

function writeCentered(text: string, x: number, y: number, width: number, height = textHeight(text)) {
  write(text, x + ((width - measureText(text)) / 2 | 0), y + ((height - textHeight(text)) / 2 | 0));
}

function drawIconFrame(rect: UiRect) {
  drawNineSlice(sprites.pink_frame, rect.x, rect.y, rect.w, rect.h);
}

function drawSpriteIcon(rect: UiRect, icon: Sprite) {
  drawSprite(
    icon,
    rect.x + ((rect.w - icon[2]) / 2 | 0),
    rect.y + ((rect.h - icon[3]) / 2 | 0),
  );
}

function drawReviveButton(progress: number, corpses: GameObject[]) {
  let enabled = progress >= 1 && corpses.length > 0;
  let pulse = enabled ? 1 + Math.sin(Date.now() / 180) : 0;
  ctx.save();
  if (pulse) {
    ctx.strokeStyle = TRAJECTORY_COLOR;
    ctx.globalAlpha = 0.25 + pulse * 0.1;
    ctx.strokeRect(REVIVE_BUTTON.x - 2, REVIVE_BUTTON.y - 2, REVIVE_BUTTON.w + 4, REVIVE_BUTTON.h + 4);
  }
  ctx.restore();

  drawIconFrame(REVIVE_BUTTON);
  drawSpriteIcon(REVIVE_BUTTON, sprites.skull);

  if (corpses.length) {
    write(`x${corpses.length}`, REVIVE_BUTTON.x - 8, REVIVE_BUTTON.y + 2);
  }

  let remaining = 1 - progress;
  if (remaining > 0 || !enabled) {
    let inset = 3;
    let h = corpses.length
      ? (REVIVE_BUTTON.h - inset * 2) * remaining | 0
      : REVIVE_BUTTON.h - inset * 2;
    ctx.save();
    ctx.fillStyle = UI_DARK;
    ctx.fillRect(
      REVIVE_BUTTON.x + inset,
      REVIVE_BUTTON.y + inset,
      REVIVE_BUTTON.w - inset * 2,
      h,
    );
    ctx.restore();
    drawIconFrame(REVIVE_BUTTON);
  }
}

function drawSpeakerIcon(rect: UiRect, muted: boolean) {
  let x = rect.x + ((rect.w - 13) / 2 | 0);
  let y = rect.y + ((rect.h - 10) / 2 | 0);

  ctx.save();
  ctx.fillStyle = UI_LIGHT;
  ctx.fillRect(x, y + 4, 3, 4);
  ctx.fillRect(x + 3, y + 3, 2, 6);
  ctx.fillRect(x + 5, y + 2, 1, 8);

  if (muted) {
    ctx.strokeStyle = UI_MUTED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 2);
    ctx.lineTo(x + 13, y + 8);
    ctx.moveTo(x + 13, y + 2);
    ctx.lineTo(x + 8, y + 8);
    ctx.stroke();
  } else {
    ctx.fillRect(x + 8, y + 3, 1, 1);
    ctx.fillRect(x + 9, y + 4, 1, 2);
    ctx.fillRect(x + 8, y + 7, 1, 1);
    ctx.fillRect(x + 11, y + 2, 1, 1);
    ctx.fillRect(x + 12, y + 3, 1, 6);
    ctx.fillRect(x + 11, y + 9, 1, 1);
  }

  ctx.restore();
}

function drawButton(rect: UiRect, label: string, icon?: Sprite) {
  drawNineSlice(sprites.pink_frame, rect.x, rect.y, rect.w, rect.h);

  const gap = icon ? 3 : 0;
  const iconWidth = icon ? icon[2] : 0;
  const contentWidth = iconWidth + gap + measureText(label);
  const contentX = rect.x + ((rect.w - contentWidth) / 2 | 0);

  if (icon) {
    drawSprite(icon, contentX, rect.y + ((rect.h - icon[3]) / 2 | 0));
  }

  write(label, contentX + iconWidth + gap, rect.y + ((rect.h - textHeight(label)) / 2 | 0));
}

function drawShopRow(rect: UiRect, name: string, cost: string, selected: boolean) {
  if (selected) {
    drawNineSlice(sprites.pink_frame, rect.x, rect.y, rect.w, rect.h);
  }

  if (!cost) {
    writeCentered(name, rect.x, rect.y, rect.w, rect.h);
    return;
  }

  const y = rect.y + ((rect.h - textHeight(name)) / 2 | 0);
  write(name, rect.x + 7, y);
  write(cost, rect.x + rect.w - measureText(cost) - 7, y);
}

function drawMuteButton() {
  drawIconFrame(MUTE_BUTTON);
  drawSpeakerIcon(MUTE_BUTTON, isMuted());
}

function drawLose() {
  const { width, height } = getLogicalSize();
  const save = getSaveState();

  ctx.save();
  ctx.fillStyle = "rgba(24, 22, 34, 0.75)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawNineSlice(sprites.pink_frame, LOSE_PANEL.x, LOSE_PANEL.y, LOSE_PANEL.w, LOSE_PANEL.h);
  writeCentered("诺曼倒下了", LOSE_PANEL.x, LOSE_PANEL.y + 12, LOSE_PANEL.w);
  writeCentered(`最高进度 ${save.completed ? "已通关" : save.highLevel + "/10"}`, LOSE_PANEL.x, LOSE_PANEL.y + 29, LOSE_PANEL.w);
  drawButton(RESTART_BUTTON, "重新开始");
}

function drawWin() {
  if (game.dialogue.length && game.dialogue[0] !== "点击重新开始") return;

  const { width, height } = getLogicalSize();
  ctx.save();
  ctx.fillStyle = "rgba(24, 22, 34, 0.65)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawNineSlice(sprites.pink_frame, LOSE_PANEL.x, LOSE_PANEL.y, LOSE_PANEL.w, LOSE_PANEL.h);
  writeCentered("诺曼胜利了", LOSE_PANEL.x, LOSE_PANEL.y + 16, LOSE_PANEL.w);
  drawButton(RESTART_BUTTON, "重新开始");
}

function drawOrbs(
  x: number,
  y: number,
  value: number,
  maxValue: number,
  sprite: Sprite,
  emptySprite: Sprite,
) {
  let x0 = x - (maxValue * 4) / 2;
  for (let i = 0; i < maxValue; i++) {
    drawSceneSprite(i < value ? sprite : emptySprite, x0 + i * 4, y);
  }
}

function drawObjects() {
  for (let object of game.objects) {
    drawSceneSprite(object.sprite, object.x, object.y + object.hop);

    if (object.is(CORPSE) && game.state === PLAYING) {
      let canRevive = game.ability.timer >= game.ability.cooldown;
      drawNineSlice(sprites.pink_frame, object.x - 2, -object.y - object.sprite[3] - 2, object.sprite[2] + 4, object.sprite[3] + 4);
      if (canRevive) {
        write("复", object.x - 1, -object.y - object.sprite[3] - 13);
      }
    }

    if (object.getBehaviour(Frozen)) {
      drawNineSlice(sprites.ice, object.x, -object.sprite[3], object.sprite[2], object.sprite[3]);
    }

    if (object.maxHp > 1 && object !== game.player) {
      if (object.maxHp < 10) {
        let { x } = object.center();
        drawOrbs(x, -6, object.hp, object.maxHp, sprites.health_orb, sprites.health_orb_empty);
      } else {
        drawSceneSprite(sprites.health_orb, object.x, -6);
        write(`${object.hp}/${object.maxHp}`, object.x + 6, 0);
      }
    }

    let { x } = object;
    for (let behaviour of object.behaviours) {
      if (behaviour.sprite) {
        drawSceneSprite(behaviour.sprite, x, -12);
        x += behaviour.sprite[2] + 1;
      }
    }
  }
}

function drawTrajectory() {
  for (let i = 0; i < game.spell.shotsPerRound; i++) {
    drawProjectileTrajectory(getSpellShotAngle(game.spell, i));
  }
}

function drawProjectileTrajectory(angle: number) {
  let projectile = createSpellKinematics(
    game.spell,
    game.getCastingPoint(),
    angle,
  );

  ctx.save();
  for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
    let alive = true;
    for (let j = 0; j < TRAJECTORY_STEPS_PER_DOT; j++) {
      alive = stepProjectileKinematics(projectile, game.stage, TRAJECTORY_STEP_MS);
      if (!alive) break;
    }

    let x = projectile.x + projectile.sprite[2] / 2;
    let y = projectile.y + projectile.sprite[3] / 2;
    if (x < 0 || x > game.stage.width) {
      break;
    }

    let size = i % 3 === 0 ? 2 : 1;
    ctx.globalAlpha = clamp(0.72 - i * 0.018, 0.18, 0.72);
    ctx.fillStyle = TRAJECTORY_COLOR;
    ctx.fillRect((x - size / 2) | 0, (-y - size / 2) | 0, size, size);

    if (!alive) break;
  }
  ctx.restore();
}

function drawBackground() {
  for (let i = 0; i < game.stage.width / 16; i++) {
    let sprite = i % 5 ? sprites.wall : sprites.door;
    drawSceneSprite(sprite, i * 16, 0);
    drawSceneSprite(sprites.floor, i * 16, -sprites.floor[3]);
    drawSceneSprite(sprites.ceiling, i * 16, game.stage.ceiling);
  }
}

function drawReticle() {
  let { x, y } = game.getCastingPoint();
  let sprite = sprites.reticle;
  drawSceneSprite(sprite, x - sprite[2] / 2, y - sprite[3] / 2);
}

function drawParticles() {
  for (let emitter of particleEmitters) {
    for (let particle of emitter.particles) {
      let variant = emitter.variants[particle.variant];
      let progress = particle.elapsed / particle.duration;
      let sprite = variant[progress * variant.length | 0];
      drawSceneSprite(sprite, particle.x, particle.y);
    }
  }
}
