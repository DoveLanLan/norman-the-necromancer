import { Damage } from "./actions";
import { PLAYING, RARE, Ritual, ShopItem, SHOPPING } from "./game";
import { clamp, randomInt, removeFromArray, shuffled } from "./helpers";
import { nextLevel } from "./levels";
import { useLevelSynths, useShopSynths } from "./sounds";

export interface Shop {
  rituals: Ritual[];
  items: ShopItem[];
  selectedIndex: number;
}

export let shop: Shop = {
  rituals: [],
  items: [],
  selectedIndex: 0,
};

export function buy() {
  let item = shop.items[shop.selectedIndex];
  if (item && item.cost <= game.souls) {
    game.souls -= item.cost;
    removeFromArray(shop.items, item);
    item.purchase();
    selectShopIndex(shop.selectedIndex);
  }
}

export function selectShopIndex(step: number) {
  shop.selectedIndex = clamp(shop.selectedIndex + step, 0, shop.items.length - 1);
}

export function enterShop() {
  game.state = SHOPPING;
  restockShop();
  game.onShopEnter();
  useShopSynths();
}

export function exitShop() {
  game.spell.casts = game.spell.maxCasts;
  game.spell.castRechargeTimer = 0;
  game.ability.timer = game.ability.cooldown;
  game.state = PLAYING;
  nextLevel();
  useLevelSynths();
}

export function restockShop() {
  let exp = Math.pow(game.level + 1, 2);
  let items: (ShopItem | false)[] = [
    game.player.hp < game.player.maxHp &&
      ShopItem(10 * game.level, "治疗", `回复 1 点生命`, () => Damage(game.player, -1)),

    ShopItem(10 * exp, "续命", `生命上限 +1`, () => {
      game.player.maxHp++;
      game.player.hp++;
    }),

    ShopItem(10 * exp, "充能", "法术槽 +1", () => game.spell.maxCasts++),

    ...createRitualItems(),
    ShopItem(0, "继续", "进入下一关", () => exitShop()),
  ];
  shop.items = items.filter(item => item) as ShopItem[];
}

export function createRitualItems(): ShopItem[] {
  let rituals = shuffled(shop.rituals.filter(ritual => game.canAddRitual(ritual)));
  let commons = rituals.filter(r => r.rarity !== RARE);
  let rares = rituals.filter(r => r.rarity === RARE);
  let pool = rares.slice(0, 1).concat(commons.slice(0, 2));
  return pool.map((ritual): ShopItem => {
    return {
      name: ritual.name,
      description: ritual.description,
      cost: ritual.rarity === RARE ? 200 + randomInt(100) : 75 + randomInt(100),
      purchase() {
        removeFromArray(shop.rituals, ritual);
        game.addRitual(ritual);
      },
    };
  });
}
