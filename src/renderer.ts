import * as sprites from "./sprites.json";
import { clear, ctx, drawNineSlice, drawSceneSprite, drawSprite, getLogicalSize, measureText, particleEmitters, Sprite, textHeight, write } from "./engine";
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
  writeCentered(selected?.description || "", SHOP_LAYOUT.descriptionX, SHOP_LAYOUT.descriptionY, SHOP_LAYOUT.rowWidth);
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

  write(`${game.level+1}-10`, width - 58, 2);

  if (game.state === PLAYING) {
    let progress = clamp(game.ability.timer / game.ability.cooldown, 0, 1);
    let cooldownWidth = Math.max(0, REVIVE_BUTTON.w * (1 - progress) | 0);
    if (cooldownWidth > 3) {
      drawNineSlice(sprites.pink_frame, REVIVE_BUTTON.x, REVIVE_BUTTON.y, cooldownWidth, REVIVE_BUTTON.h);
    }
    drawButton(REVIVE_BUTTON, progress === 1 ? "复活" : (((1 - progress) * game.ability.cooldown) / 1000 | 0) + "s", sprites.skull);
  }
}

function writeCentered(text: string, x: number, y: number, width: number, height = textHeight(text)) {
  write(text, x + ((width - measureText(text)) / 2 | 0), y + ((height - textHeight(text)) / 2 | 0));
}

function drawButton(rect: UiRect, label: string, icon?: Sprite) {
  drawNineSlice(sprites.pink_frame, rect.x, rect.y, rect.w, rect.h);

  const gap = icon ? 4 : 0;
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
  write(name, rect.x + 8, y);
  write(cost, rect.x + rect.w - measureText(cost) - 8, y);
}

function drawMuteButton() {
  drawButton(MUTE_BUTTON, isMuted() ? "静" : "音");
}

function drawLose() {
  const { width, height } = getLogicalSize();
  const save = getSaveState();

  ctx.save();
  ctx.fillStyle = "rgba(24, 22, 34, 0.75)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawNineSlice(sprites.pink_frame, 118, 72, 164, 76);
  writeCentered("诺曼倒下了", 118, 86, 164);
  writeCentered(`最高进度 ${save.completed ? "已通关" : save.highLevel + "/10"}`, 118, 104, 164);
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
