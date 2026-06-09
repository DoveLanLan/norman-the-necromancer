import * as sprites from "./sprites.json";
import { init, resetEngineState, updateParticles, updateTweens } from "./engine";
import { Game, INTRO, LOSE, PLAYING, SHOPPING, WIN } from "./game";
import { render, screenToSceneCoords } from "./renderer";
import { Cast, Resurrect, resetActions } from "./actions";
import { angleBetweenPoints } from "./helpers";
import { Player } from "./objects";
import { isComplete, isLevelFinished, resetLevels, updateLevel } from "./levels";
import { Studious, Bleed, Bouncing, Tearstone, Ceiling, Drunkard, Salvage, Chilly, Hunter, Knockback, Rain, Seer, Doubleshot, Streak, Weightless, Electrodynamics, Impatience, Giants, Avarice, Hardened, Allegiance } from "./rituals";
import { buy, enterShop, selectShopIndex, shop } from "./shop";
import { dust } from "./fx";
import { BPM, play, setMuted, toggleMute } from "./sounds";
import { March } from "./behaviours";
import { platform, PointerInput } from "./platform";
import { getSaveState, recordMuted, recordProgress } from "./storage";
import { contains, MUTE_BUTTON, RESTART_BUTTON, REVIVE_BUTTON, shopIndexAt } from "./ui";

let player: ReturnType<typeof Player> = undefined!;
let game: Game = undefined!;
let paused = false;
let normanIsBouncing = false;
let dialogueTimer = 0;

const ARROW_UP = 38;
const ARROW_DOWN = 40;
const SPACE = 32;
const ENTER = 13;
const KEY_P = 80;

const INTRO_DIALOGUE = [
  "诺曼不是个讨人喜欢的死灵法师...",
  "村民们总想把他赶出村子。",
  "有时候，他们甚至真的成功了 (@)",
  "但像样的死灵法师...",
  "总能把自己再召回来。",
  "拖动瞄准，点击施法。",
  "右下角按钮可以复活尸骨。",
];

const OUTRO_DIALOGUE = [
  "",
  "一切终于安静了。",
  "诺曼可以继续研究死灵术。",
  "但他知道，村民迟早还会回来。",
  "完",
];

function aimAt({ x, y }: PointerInput) {
  let p1 = player.center();
  let p2 = screenToSceneCoords(x, y);
  game.spell.targetAngle = angleBetweenPoints(p1, p2);
}

function startPlaying() {
  play();
  game.state = PLAYING;
  game.player.sprite = sprites.norman_arms_down;
}

function handlePointerUp(point: PointerInput) {
  if (contains(MUTE_BUTTON, point.x, point.y)) {
    recordMuted(toggleMute());
    return;
  }

  if (game.state === LOSE) {
    if (contains(RESTART_BUTTON, point.x, point.y)) {
      createGame();
    }
    return;
  }

  if (game.state === SHOPPING) {
    let index = shopIndexAt(point.x, point.y, shop.items.length);
    if (index >= 0) {
      selectShopIndex(index - shop.selectedIndex);
      buy();
    }
    return;
  }

  aimAt(point);

  if (game.state === PLAYING && contains(REVIVE_BUTTON, point.x, point.y)) {
    Resurrect();
    return;
  }

  if (game.state === INTRO) {
    startPlaying();
  }

  Cast();
}

function handleKey(key: number) {
  if (game.state === PLAYING) {
    if (key === SPACE) Resurrect();
    if (key === KEY_P) paused = !paused;
  } else if (game.state === SHOPPING) {
    if (key === ARROW_UP) selectShopIndex(-1);
    if (key === ARROW_DOWN) selectShopIndex(+1);
    if (key === ENTER) buy();
  } else if (game.state === LOSE && key === ENTER) {
    createGame();
  }
}

function update(dt: number) {
  updateDialogue(dt);
  render(dt);
  if (paused) return;

  if (game.state === PLAYING) {
    updateLevel(dt);
    recordProgress(game.level + 1);
  }

  if (game.state !== INTRO && game.state !== LOSE) {
    game.update(dt);
  }

  updateTweens(dt);
  updateParticles(dt);


  if (game.state === PLAYING && isLevelFinished()) {
    if (isComplete()) {
      onWin();
    } else {
      game.onLevelEnd();
      enterShop();
    }
  }

  if (game.level === 2 && !normanIsBouncing) {
    game.player.addBehaviour(new March(game.player, 0));
    game.player.updateClock = 100;
    game.player.updateSpeed = 60_000 / BPM * 2;
    normanIsBouncing = true;
  }
}

function onWin() {
  game.state = WIN;
  recordProgress(10, true);
  game.dialogue = OUTRO_DIALOGUE;
}

function updateDialogue(dt: number) {
  if ((dialogueTimer += dt) > 4000) {
    game.dialogue.shift()
    dialogueTimer = 0;

    // If the player watched the whole dialogue, remind them to click to start
    if (game.state === INTRO && game.dialogue.length === 0) {
      game.dialogue.push("拖动瞄准，点击开始");
    }
  }
}

function createRitualPool() {
  return [
    Bouncing,
    Ceiling,
    Rain,
    Doubleshot,
    Hunter,
    Weightless,
    Knockback,
    Drunkard,
    Seer,
    Tearstone,
    Impatience,
    Bleed,
    Salvage,
    Studious,
    Electrodynamics,
    Chilly,
    Giants,
    Avarice,
    Hardened,
    Allegiance,
  ];
}

function createGame() {
  resetActions();
  resetEngineState();
  resetLevels();
  dialogueTimer = 0;
  normanIsBouncing = false;
  paused = false;

  player = Player();
  player.sprite = sprites.skull;
  game = new Game(player);
  game.addRitual(Streak);
  game.dialogue = INTRO_DIALOGUE.slice();
  shop.rituals = createRitualPool();
  shop.items = [];
  shop.selectedIndex = 0;
  dust().burst(200);
}

setMuted(getSaveState().muted);
createGame();
platform.onPointerMove(aimAt);
platform.onPointerUp(handlePointerUp);
platform.onKeyDown(handleKey);
init(game.stage.width, game.stage.height, update);
