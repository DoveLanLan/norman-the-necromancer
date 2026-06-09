export interface UiRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REVIVE_BUTTON: UiRect = { x: 302, y: 182, w: 88, h: 14 };
export const MUTE_BUTTON: UiRect = { x: 372, y: 4, w: 20, h: 12 };
export const RESTART_BUTTON: UiRect = { x: 154, y: 122, w: 92, h: 16 };

export const SHOP_LAYOUT = {
  titleX: 130,
  titleY: 18,
  itemX: 88,
  itemY: 38,
  rowHeight: 12,
  rowWidth: 225,
  descriptionX: 88,
  descriptionY: 124,
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
