import * as sprites from "./sprites.json";
import { clear, ctx, drawNineSlice, drawSceneSprite, drawSprite, getLogicalSize, particleEmitters, Sprite, write } from "./engine";
import { clamp, Point, randomInt } from "./helpers";
import { INTRO, LOSE, PLAYING, SHOPPING } from "./game";
import { shop } from "./shop";
import { Frozen } from "./behaviours";
import { getSaveState } from "./storage";
import { isMuted } from "./sounds";
import { MUTE_BUTTON, RESTART_BUTTON, REVIVE_BUTTON, SHOP_LAYOUT, UiRect } from "./ui";

const ICON_SOULS = "$";

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
  if (game.state === PLAYING) drawReticle();
  ctx.restore();

  drawHud();

  if (game.state === SHOPPING) {
    drawShop();
  }

  if (game.state === LOSE) {
    drawLose();
  }

  drawMuteButton();
}

function drawShop() {
  write("仪式商店", SHOP_LAYOUT.titleX, SHOP_LAYOUT.titleY);
  let selected = shop.items[shop.selectedIndex];
  for (let i = 0; i < shop.items.length; i++) {
    let item = shop.items[i];
    let cost = item.cost ? ` $${item.cost}` : "";
    let marker = item === selected ? ">" : " ";
    write(`${marker}${item.name}${cost}`, SHOP_LAYOUT.itemX, SHOP_LAYOUT.itemY + i * SHOP_LAYOUT.rowHeight);
  }
  write(selected?.description || "", SHOP_LAYOUT.descriptionX, SHOP_LAYOUT.descriptionY);
}

function drawHud() {
  const { width, height } = getLogicalSize();

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

  write(`${game.level+1}-10`, width - 58, 2);

  if (game.state === PLAYING) {
    let progress = clamp(game.ability.timer / game.ability.cooldown, 0, 1);
    drawNineSlice(sprites.pink_frame, REVIVE_BUTTON.x, REVIVE_BUTTON.y, REVIVE_BUTTON.w * (1 - progress) | 0, REVIVE_BUTTON.h);
    drawButton(REVIVE_BUTTON, progress === 1 ? "复活" : (((1 - progress) * game.ability.cooldown) / 1000 | 0) + "s");
    drawSprite(sprites.skull, REVIVE_BUTTON.x + 3, REVIVE_BUTTON.y + 3);
  }
}

function drawButton(rect: UiRect, label: string) {
  drawNineSlice(sprites.pink_frame, rect.x, rect.y, rect.w, rect.h);
  write(label, rect.x + 22, rect.y + 4);
}

function drawMuteButton() {
  drawNineSlice(sprites.pink_frame, MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h);
  write(isMuted() ? "静" : "音", MUTE_BUTTON.x + 5, MUTE_BUTTON.y + 3);
}

function drawLose() {
  const { width, height } = getLogicalSize();
  const save = getSaveState();

  ctx.save();
  ctx.fillStyle = "rgba(24, 22, 34, 0.75)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawNineSlice(sprites.pink_frame, 118, 72, 164, 76);
  write("诺曼倒下了", 160, 86);
  write(`最高进度 ${save.completed ? "已通关" : save.highLevel + "/10"}`, 148, 104);
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
