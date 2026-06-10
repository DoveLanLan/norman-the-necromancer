export interface PointerInput {
  x: number;
  y: number;
}

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DisplayMetrics {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  pixelRatio: number;
  safeInsets: SafeInsets;
}

interface PlatformImage {
  src: string;
}

interface Platform {
  canvas: HTMLCanvasElement | any;
  ctx: CanvasRenderingContext2D;
  isWechat: boolean;
  createImage(): PlatformImage;
  createAudioContext(): AudioContext | undefined;
  clear(width: number, height: number): void;
  resize(width: number, height: number): DisplayMetrics;
  screenToLogical(x: number, y: number): PointerInput;
  onPointerMove(handler: (point: PointerInput) => void): void;
  onPointerUp(handler: (point: PointerInput) => void): void;
  onKeyDown(handler: (key: number) => void): void;
  onResize(handler: () => void): void;
  onFocus(handler: () => void): void;
  requestFrame(callback: FrameRequestCallback): number;
  now(): number;
  getStorage(key: string): string | undefined;
  setStorage(key: string, value: string): void;
}

declare const wx: any;

const BACKGROUND = "#181622";
const emptyInsets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function getWechat() {
  return typeof globalThis !== "undefined" ? (globalThis as any).wx : undefined;
}

function createBrowserPlatform(): Platform {
  let canvas = document.getElementById("c") as HTMLCanvasElement | null;

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "c";
    document.body.appendChild(canvas);
  }

  canvas.style.imageRendering = "pixelated";

  const ctx = canvas.getContext("2d")!;
  let logicalWidth = 400;
  let logicalHeight = 200;
  let metrics: DisplayMetrics = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: innerWidth,
    height: innerHeight,
    pixelRatio: devicePixelRatio || 1,
    safeInsets: emptyInsets,
  };

  function useGameTransform() {
    const dpr = metrics.pixelRatio;
    ctx.setTransform(dpr * metrics.scale, 0, 0, dpr * metrics.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function screenToLogical(x: number, y: number): PointerInput {
    const rect = canvas!.getBoundingClientRect();
    return {
      x: ((x - rect.x) / metrics.scale) | 0,
      y: ((y - rect.y) / metrics.scale) | 0,
    };
  }

  return {
    canvas,
    ctx,
    isWechat: false,
    createImage: () => new Image(),
    createAudioContext() {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      return AudioCtor ? new AudioCtor() : undefined;
    },
    clear(width, height) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      useGameTransform();
    },
    resize(width, height) {
      logicalWidth = width;
      logicalHeight = height;
      const scale = Math.min(innerWidth / width, innerHeight / height, 3);
      const pixelRatio = devicePixelRatio || 1;
      const cssWidth = width * scale;
      const cssHeight = height * scale;
      canvas!.width = Math.max(1, Math.round(cssWidth * pixelRatio));
      canvas!.height = Math.max(1, Math.round(cssHeight * pixelRatio));
      canvas!.style.width = cssWidth + "px";
      canvas!.style.height = cssHeight + "px";
      metrics = {
        scale,
        offsetX: 0,
        offsetY: 0,
        width: innerWidth,
        height: innerHeight,
        pixelRatio,
        safeInsets: emptyInsets,
      };
      useGameTransform();
      return metrics;
    },
    screenToLogical,
    onPointerMove(handler) {
      canvas!.addEventListener("pointermove", event => {
        handler(screenToLogical(event.clientX, event.clientY));
      });
    },
    onPointerUp(handler) {
      canvas!.addEventListener("pointerup", event => {
        handler(screenToLogical(event.clientX, event.clientY));
      });
    },
    onKeyDown(handler) {
      window.addEventListener("keydown", event => handler(event.which || event.keyCode));
    },
    onResize(handler) {
      window.addEventListener("resize", handler);
    },
    onFocus(handler) {
      window.addEventListener("focus", handler);
    },
    requestFrame: callback => requestAnimationFrame(callback),
    now: () => performance.now(),
    getStorage(key) {
      try {
        return localStorage.getItem(key) || undefined;
      } catch {
        return undefined;
      }
    },
    setStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };
}

function createWechatPlatform(wxApi: typeof wx): Platform {
  const canvas = wxApi.createCanvas();
  const ctx = canvas.getContext("2d");
  let metrics: DisplayMetrics = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 400,
    height: 200,
    pixelRatio: 1,
    safeInsets: emptyInsets,
  };

  function getWindowInfo() {
    return wxApi.getWindowInfo?.() || wxApi.getSystemInfoSync?.() || {};
  }

  function toSafeInsets(info: any): SafeInsets {
    const width = info.windowWidth || info.screenWidth || metrics.width;
    const height = info.windowHeight || info.screenHeight || metrics.height;
    const safeArea = info.safeArea;

    if (!safeArea) return emptyInsets;

    return {
      top: safeArea.top || 0,
      right: Math.max(0, width - safeArea.right),
      bottom: Math.max(0, height - safeArea.bottom),
      left: safeArea.left || 0,
    };
  }

  function useGameTransform(width: number, height: number) {
    const dpr = metrics.pixelRatio;
    ctx.setTransform(
      dpr * metrics.scale,
      0,
      0,
      dpr * metrics.scale,
      dpr * metrics.offsetX,
      dpr * metrics.offsetY,
    );
    ctx.imageSmoothingEnabled = false;
  }

  function readTouch(event: any): PointerInput | undefined {
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    if (!touch) return undefined;
    return {
      x: touch.clientX ?? touch.x,
      y: touch.clientY ?? touch.y,
    };
  }

  return {
    canvas,
    ctx,
    isWechat: true,
    createImage() {
      if (typeof canvas.createImage === "function") return canvas.createImage();
      if (typeof wxApi.createImage === "function") return wxApi.createImage();
      return { src: "" };
    },
    createAudioContext() {
      const AudioCtor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      try {
        return AudioCtor ? new AudioCtor() : undefined;
      } catch {
        return undefined;
      }
    },
    clear(width, height) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      useGameTransform(width, height);
    },
    resize(width, height) {
      const info = getWindowInfo();
      const pixelRatio = info.pixelRatio || 1;
      const windowWidth = info.windowWidth || info.screenWidth || width;
      const windowHeight = info.windowHeight || info.screenHeight || height;
      const safeInsets = toSafeInsets(info);
      const availableWidth = windowWidth - safeInsets.left - safeInsets.right;
      const availableHeight = windowHeight - safeInsets.top - safeInsets.bottom;
      const scale = Math.min(availableWidth / width, availableHeight / height);

      metrics = {
        scale,
        offsetX: safeInsets.left + (availableWidth - width * scale) / 2,
        offsetY: safeInsets.top + (availableHeight - height * scale) / 2,
        width: windowWidth,
        height: windowHeight,
        pixelRatio,
        safeInsets,
      };

      canvas.width = Math.max(1, Math.round(windowWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(windowHeight * pixelRatio));
      useGameTransform(width, height);
      return metrics;
    },
    screenToLogical(x, y) {
      return {
        x: ((x - metrics.offsetX) / metrics.scale) | 0,
        y: ((y - metrics.offsetY) / metrics.scale) | 0,
      };
    },
    onPointerMove(handler) {
      wxApi.onTouchMove?.((event: any) => {
        const point = readTouch(event);
        if (point) handler(this.screenToLogical(point.x, point.y));
      });
    },
    onPointerUp(handler) {
      const handleTouch = (event: any) => {
        const point = readTouch(event);
        if (point) handler(this.screenToLogical(point.x, point.y));
      };
      wxApi.onTouchEnd?.(handleTouch);
    },
    onKeyDown() {},
    onResize(handler) {
      wxApi.onWindowResize?.(handler);
    },
    onFocus(handler) {
      wxApi.onShow?.(handler);
    },
    requestFrame(callback) {
      const raf = wxApi.requestAnimationFrame || (globalThis as any).requestAnimationFrame;
      return raf ? raf(callback) : setTimeout(() => callback(Date.now()), 16) as any;
    },
    now() {
      return Date.now();
    },
    getStorage(key) {
      try {
        return wxApi.getStorageSync(key) || undefined;
      } catch {
        return undefined;
      }
    },
    setStorage(key, value) {
      try {
        wxApi.setStorageSync(key, value);
      } catch {}
    },
  };
}

export const platform: Platform = getWechat()
  ? createWechatPlatform(getWechat())
  : createBrowserPlatform();
