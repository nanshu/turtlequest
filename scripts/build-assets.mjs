#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const outDir = path.join(rootDir, "dist");

fs.mkdirSync(outDir, { recursive: true });

const expectedFiles = new Set();

function syncFile(relPath) {
  const src = path.join(rootDir, relPath);
  const dest = path.join(outDir, relPath);
  expectedFiles.add(relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function syncDir(relDir) {
  const absDir = path.join(rootDir, relDir);
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const childRel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      syncDir(childRel);
    } else if (entry.isFile()) {
      syncFile(childRel);
    }
  }
}

for (const file of ["index.html", "_headers"]) {
  syncFile(file);
}
for (const dir of ["css", "js"]) {
  syncDir(dir);
}

// Prune any stale files in dist/ without deleting dist/ first (avoids mid-dev 404s)
function pruneStale(absDir, relBase = "") {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      pruneStale(absPath, relPath);
      if (fs.readdirSync(absPath).length === 0) {
        fs.rmdirSync(absPath);
      }
    } else if (!expectedFiles.has(relPath)) {
      fs.unlinkSync(absPath);
    }
  }
}
pruneStale(outDir);

console.log(`Synced ${expectedFiles.size} static assets into dist/`);
