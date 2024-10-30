import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

function getAllHtmlFiles(path, files) {
  const folder = fs.readdirSync(path);

  files = files || [];

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
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getAllHtmlFiles(resolve(__dirname, "examples")).reduce((entries, file) => {
        const name = file.replace(resolve(__dirname, "examples") + "/", "").replace(".html", "");
        entries[name] = file;
        return entries;
      }, {}),
    },
  },
});
