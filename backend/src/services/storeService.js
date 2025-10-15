"use strict";

const fs = require("fs/promises");
const { writeJson, ensureDir } = require("../utils/file.js");

async function ensureDataDir(dir) {
  await ensureDir(dir);
}

async function loadStore(storePath) {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const arr = JSON.parse(raw);
    const byDomain = new Map(arr.map((c) => [String(c.domain).toLowerCase(), c]));
    return { arr, byDomain };
  } catch (er) {
    return { arr: [], byDomain: new Map() };
  }
}

async function saveStore(storePath, arr) {
  await writeJson(storePath, arr);
}

async function mergeAndSaveIfNew(storePath, store, incoming) {
  let added = 0;
  for (const c of incoming) {
    const key = String(c.domain || "").toLowerCase();
    if (!key) continue;
    if (!store.byDomain.has(key)) {
      store.byDomain.set(key, c);
      store.arr.push(c);
      added++;
    }
  }
  if (added > 0) {
    await saveStore(storePath, store.arr);
  }
  return added;
}

module.exports = { ensureDataDir, loadStore, saveStore, mergeAndSaveIfNew };
