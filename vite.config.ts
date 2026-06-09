import { defineConfig, Plugin } from "vite";

export default defineConfig(({ mode }) => {
  const isWechat = mode === "wechat";

  return {
    plugins: isWechat ? [wechatFiles()] : [singleFile()],
    base: "./",
    build: {
      outDir: isWechat ? "dist-wechat" : "dist",
      polyfillModulePreload: false,
      reportCompressedSize: false,
      assetsInlineLimit: 0,
      minify: "terser",
      terserOptions: {
        compress: {
          unsafe_arrows: true,
          passes: 2,
        },
      },
      rollupOptions: {
        input: isWechat ? "src/index.ts" : "index.html",
        output: {
          entryFileNames: isWechat ? "game.js" : `[name].js`,
          chunkFileNames: `[name].js`,
          assetFileNames: `[name].[ext]`,
          format: isWechat ? "iife" : undefined,
          name: isWechat ? "NormanTheNecromancer" : undefined,
        },
      },
    },
  };
});

function singleFile(): Plugin {
  return {
    name: "vite:single-file",
    enforce: "post",
    generateBundle(options, bundle) {
      let html = bundle["index.html"] as any;
      let js = bundle["index.js"] as any;

      if (html.type === "asset") {
        html.source = html.source
          .replace(/<script.*<\/script>/, "")
          .replace("</body>", () => `<script>${js.code}</script>`)
          .replace(/\n+/g, "");
      }

      delete bundle[js.fileName];
    }
  };
}

function wechatFiles(): Plugin {
  return {
    name: "wechat-files",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "game.json",
        source: JSON.stringify({
          deviceOrientation: "landscape",
          showStatusBar: false,
        }, null, 2),
      });
    }
  };
}
