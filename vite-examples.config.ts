import fs from "fs";
import typescript from "vite-plugin-typescript";
import { defineConfig, UserConfig } from "vite";
import { resolve } from "path";

function getAllHtmlFiles(path: string, files: string[] = []): string[] {
  const folder = fs.readdirSync(path);

  folder.forEach((file) => {
    const filePath = resolve(path, file);
    if (fs.statSync(filePath).isDirectory()) {
      files = getAllHtmlFiles(filePath, files);
    } else if (file.endsWith(".html")) {
      files.push(filePath);
    }
  });

  return files;
}

export default defineConfig({
  base: "/three-low-poly",
  root: "./examples",
  plugins: [typescript()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getAllHtmlFiles(resolve(__dirname, "examples")).reduce((entries: Record<string, string>, file: string) => {
        const name = file.replace(resolve(__dirname, "examples") + "/", "").replace(".html", "");
        entries[name] = file;
        return entries;
      }, {}),
    },
  },
} satisfies UserConfig);
