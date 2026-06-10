export interface UiRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REVIVE_BUTTON: UiRect = { x: 334, y: 180, w: 58, h: 16 };
export const REVIVE_HIT_AREA: UiRect = { x: 306, y: 166, w: 94, h: 34 };

export const MUTE_BUTTON: UiRect = { x: 374, y: 5, w: 18, h: 14 };
export const MUTE_HIT_AREA: UiRect = { x: 360, y: 0, w: 40, h: 28 };

export const LOSE_PANEL: UiRect = { x: 136, y: 78, w: 128, h: 64 };
export const RESTART_BUTTON: UiRect = { x: 166, y: 123, w: 68, h: 15 };
export const RESTART_HIT_AREA: UiRect = { x: 148, y: 114, w: 104, h: 30 };

export const SHOP_LAYOUT = {
  titleY: 18,
  itemX: 124,
  itemY: 38,
  rowHeight: 16,
  rowWidth: 152,
  rowHeightVisual: 14,
  descriptionY: 158,
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
