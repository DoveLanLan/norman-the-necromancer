export interface UiRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REVIVE_BUTTON: UiRect = { x: 296, y: 176, w: 96, h: 20 };
export const MUTE_BUTTON: UiRect = { x: 362, y: 5, w: 30, h: 18 };
export const RESTART_BUTTON: UiRect = { x: 136, y: 118, w: 128, h: 20 };

export const SHOP_LAYOUT = {
  titleX: 160,
  titleY: 18,
  itemX: 72,
  itemY: 38,
  rowHeight: 18,
  rowWidth: 256,
  rowHeightVisual: 16,
  descriptionX: 72,
  descriptionY: 154,
};

export function contains(rect: UiRect, x: number, y: number) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function shopIndexAt(x: number, y: number, count: number) {
  const { itemX, itemY, rowHeight, rowWidth } = SHOP_LAYOUT;
  if (x < itemX || x > itemX + rowWidth || y < itemY) return -1;

  const index = ((y - itemY) / rowHeight) | 0;
  return index >= 0 && index < count ? index : -1;
}
