import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasFullMetadata,
  mergeCollections,
} from "./sync_nft_collections_to_token_storage.mjs";

function nftGeekEntry(overrides = {}) {
  return {
    canisterId: "aaaaa-aa",
    name: "Motoko Ghosts",
    alias: "ghosts",
    interface: "EXT",
    ...overrides,
  };
}

function toniqEntry(overrides = {}) {
  return {
    id: "aaaaa-aa",
    description: "Spooky ghosts on the IC.",
    avatar: "https://example.com/avatar.png",
    collection: "https://example.com/collection.png",
    royalty: "aaaaa-aa:0.05",
    ...overrides,
  };
}

test("mergeCollections keeps a collection with all four metadata fields present", () => {
  const merged = mergeCollections([nftGeekEntry()], [toniqEntry()]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].collectionId, "aaaaa-aa");
  assert.equal(merged[0].name, "Motoko Ghosts");
  assert.equal(merged[0].description, "Spooky ghosts on the IC.");
  assert.equal(merged[0].image, "https://example.com/avatar.png");
  assert.equal(merged[0].standard, "EXT");
});

test("mergeCollections drops a collection with no name or alias", () => {
  const merged = mergeCollections(
    [nftGeekEntry({ name: undefined, alias: undefined })],
    [toniqEntry()],
  );

  assert.equal(merged.length, 0);
});

test("mergeCollections drops a collection with no interface/standard", () => {
  const merged = mergeCollections(
    [nftGeekEntry({ interface: undefined })],
    [toniqEntry()],
  );

  assert.equal(merged.length, 0);
});

test("mergeCollections drops a collection with no matching Toniq entry", () => {
  const merged = mergeCollections([nftGeekEntry()], []);

  assert.equal(merged.length, 0);
});

test("mergeCollections marks surviving collections isDefault true and isCashier false", () => {
  const merged = mergeCollections([nftGeekEntry()], [toniqEntry()]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].isDefault, true);
  assert.equal(merged[0].isCashier, false);
});

test("mergeCollections still resolves image from avatar-or-collection and parses royalty when Toniq data present", () => {
  const withoutAvatar = mergeCollections(
    [nftGeekEntry()],
    [toniqEntry({ avatar: undefined })],
  );

  assert.equal(withoutAvatar.length, 1);
  assert.equal(withoutAvatar[0].image, "https://example.com/collection.png");
  assert.equal(withoutAvatar[0].royalty, 5);
});

test("hasFullMetadata returns true only when name, description, image, and standard are all non-empty after trim", () => {
  const complete = {
    name: "Motoko Ghosts",
    description: "Spooky ghosts on the IC.",
    image: "https://example.com/avatar.png",
    standard: "EXT",
  };
  assert.equal(hasFullMetadata(complete), true);

  assert.equal(hasFullMetadata({ ...complete, name: "" }), false);
  assert.equal(hasFullMetadata({ ...complete, name: "   " }), false);
  assert.equal(hasFullMetadata({ ...complete, description: "" }), false);
  assert.equal(hasFullMetadata({ ...complete, image: "" }), false);
  assert.equal(hasFullMetadata({ ...complete, standard: "" }), false);
});
