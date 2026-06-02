#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  idlFactory as omnityIcpIdlFactory,
} from "../src/cashier_frontend_new/src/lib/generated/omnity_icp/omnity_icp.did.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const frontendRequire = createRequire(
  path.join(repoRoot, "src/cashier_frontend_new/package.json"),
);

const { Actor, HttpAgent } = frontendRequire("@dfinity/agent");
const { IDL } = frontendRequire("@dfinity/candid");
const { Principal } = frontendRequire("@dfinity/principal");

const DEFAULT_OMNITY_ICP_CANISTER_ID = "7ywcn-nyaaa-aaaar-qaeza-cai";
const DEFAULT_HOST = "https://icp-api.io";
const DEFAULT_TEMPLATE = "scripts/args/token_storage_args.template";
const RUNE_TOKEN_PREFIX = "Bitcoin-runes-";
const DEFAULT_CONCURRENCY = 8;

const ledgerIdlFactory = ({ IDL }) =>
  IDL.Service({
    icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
    icrc1_name: IDL.Func([], [IDL.Text], ["query"]),
    icrc1_symbol: IDL.Func([], [IDL.Text], ["query"]),
    icrc10_supported_standards: IDL.Func(
      [],
      [IDL.Vec(IDL.Record({ name: IDL.Text, url: IDL.Text }))],
      ["query"],
    ),
  });

function parseArgs(argv) {
  const args = {
    canisterId: DEFAULT_OMNITY_ICP_CANISTER_ID,
    dryRun: false,
    host: DEFAULT_HOST,
    template: path.join(repoRoot, DEFAULT_TEMPLATE),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--canister-id":
        args.canisterId = requiredValue(argv, ++i, arg);
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--host":
        args.host = requiredValue(argv, ++i, arg);
        break;
      case "--template":
        args.template = path.resolve(repoRoot, requiredValue(argv, ++i, arg));
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/sync_omnity_runes_to_token_storage.mjs [options]

Options:
  --dry-run             Print summary and diff preview without writing.
  --canister-id <id>    Omnity ICP canister id. Defaults to ${DEFAULT_OMNITY_ICP_CANISTER_ID}.
  --template <path>     Token storage args template. Defaults to ${DEFAULT_TEMPLATE}.
  --host <url>          IC replica host. Defaults to ${DEFAULT_HOST}.
  -h, --help            Show this help.
`);
}

function isRuneToken(token) {
  return (
    token.rune_id.length > 0 &&
    token.principal.length > 0 &&
    token.token_id.startsWith(RUNE_TOKEN_PREFIX)
  );
}

function tokenNameFallback(token) {
  return token.token_id.startsWith(RUNE_TOKEN_PREFIX)
    ? token.token_id.slice(RUNE_TOKEN_PREFIX.length)
    : token.symbol;
}

async function enrichRuneToken(agent, token, index, total) {
  const ledgerId = token.principal[0];
  const actor = Actor.createActor(ledgerIdlFactory, {
    agent,
    canisterId: ledgerId,
  });

  const [fee, standards, name, symbol] = await Promise.all([
    queryWithWarning(
      () => actor.icrc1_fee(),
      0n,
      `${ledgerId.toText()} icrc1_fee failed; using 0`,
    ),
    queryWithWarning(
      () => actor.icrc10_supported_standards(),
      [{ name: "ICRC-1", url: "" }],
      `${ledgerId.toText()} icrc10_supported_standards failed; using ICRC1`,
    ),
    queryWithWarning(
      () => actor.icrc1_name(),
      tokenNameFallback(token),
      `${ledgerId.toText()} icrc1_name failed; using token id fallback`,
    ),
    queryWithWarning(
      () => actor.icrc1_symbol(),
      token.symbol,
      `${ledgerId.toText()} icrc1_symbol failed; using Omnity symbol`,
    ),
  ]);

  if ((index + 1) % 25 === 0 || index + 1 === total) {
    console.error(`Enriched ${index + 1}/${total} Rune ledgers`);
  }

  return {
    decimals: token.decimals,
    fee,
    icon: token.icon[0] ?? null,
    ledgerId,
    name,
    runeId: token.rune_id[0],
    standards: normalizeStandards(standards),
    symbol,
    tokenId: token.token_id,
  };
}

async function queryWithWarning(query, fallback, message) {
  try {
    return await query();
  } catch (error) {
    console.warn(`Warning: ${message}: ${error}`);
    return fallback;
  }
}

function normalizeStandards(standards) {
  const supported = [];
  const seen = new Set();

  for (const item of standards) {
    const value = String(item.name ?? "").toUpperCase().replace(/-/g, "");
    if (["ICRC1", "ICRC2", "ICRC3"].includes(value) && !seen.has(value)) {
      seen.add(value);
      supported.push(value);
    }
  }

  return supported.length > 0 ? supported : ["ICRC1"];
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(
        items[currentIndex],
        currentIndex,
        items.length,
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

function generateRegistryRecord(token) {
  return `record {
      details = variant { IC = record {
        ledger_id = principal "${token.ledgerId.toText()}";
        index_id = null : opt principal;
        fee = ${token.fee.toString()} : nat;
        supported_standards = vec { ${token.standards
          .map((standard) => `variant { ${standard} }`)
          .join("; ")} };
      }};
      symbol = "${escapeCandidText(token.symbol)}";
      name = "${escapeCandidText(token.name)}";
      decimals = ${token.decimals}: nat8;
      enabled_by_default = false;
      is_rune = opt true;
      rune_info = opt record {
        rune_id = "${escapeCandidText(token.runeId)}";
        token_id = "${escapeCandidText(token.tokenId)}";
        icon = ${formatOptionalText(token.icon)};
      };
    };`;
}

function formatOptionalText(value) {
  return value ? `opt "${escapeCandidText(value)}"` : "null : opt text";
}

function escapeCandidText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function upsertTemplate(template, generatedRecords) {
  const tokenVector = findTokenVector(template);
  const existingRecords = parseTopLevelRecords(template, tokenVector);
  const generatedByLedger = new Map(
    generatedRecords.map((record) => [record.ledgerId.toText(), record]),
  );
  const seenLedgers = new Set();
  let replaced = 0;
  let result = template.slice(0, tokenVector.contentStart);

  for (const record of existingRecords) {
    const ledgerId = extractLedgerId(record.text);
    if (ledgerId && generatedByLedger.has(ledgerId)) {
      result += generatedByLedger.get(ledgerId).text;
      seenLedgers.add(ledgerId);
      replaced += 1;
    } else {
      result += record.text;
    }
  }

  const appendedRecords = generatedRecords.filter(
    (record) => !seenLedgers.has(record.ledgerId.toText()),
  );

  const trailingWhitespace = result.match(/\s*$/u)?.[0] ?? "";
  if (trailingWhitespace.length > 0) {
    result = result.slice(0, -trailingWhitespace.length);
  }

  if (appendedRecords.length > 0 && !result.endsWith("\n")) {
    result += "\n";
  }

  for (const record of appendedRecords) {
    result += `    ${record.text}\n`;
  }

  result += trailingWhitespace;
  result += template.slice(tokenVector.contentEnd);

  return {
    appended: appendedRecords.length,
    output: result,
    replaced,
  };
}

function findTokenVector(template) {
  const marker = "tokens = opt vec";
  const markerIndex = template.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Could not find '${marker}' in template`);
  }

  const openBrace = template.indexOf("{", markerIndex);
  if (openBrace === -1) {
    throw new Error("Could not find opening brace for tokens vector");
  }

  const closeBrace = findMatchingBrace(template, openBrace);
  return {
    contentStart: openBrace + 1,
    contentEnd: closeBrace,
  };
}

function parseTopLevelRecords(template, tokenVector) {
  const records = [];
  let cursor = tokenVector.contentStart;

  while (cursor < tokenVector.contentEnd) {
    const recordIndex = indexOfWord(template, "record", cursor, tokenVector.contentEnd);
    if (recordIndex === -1) {
      if (cursor < tokenVector.contentEnd) {
        records.push({
          text: template.slice(cursor, tokenVector.contentEnd),
        });
      }
      break;
    }

    if (recordIndex > cursor) {
      records.push({
        text: template.slice(cursor, recordIndex),
      });
    }

    const openBrace = template.indexOf("{", recordIndex);
    if (openBrace === -1 || openBrace >= tokenVector.contentEnd) {
      throw new Error(`Could not parse record at offset ${recordIndex}`);
    }

    const closeBrace = findMatchingBrace(template, openBrace);
    let end = closeBrace + 1;
    while (end < tokenVector.contentEnd && /\s/.test(template[end])) {
      end += 1;
    }
    if (template[end] === ";") {
      end += 1;
    }

    records.push({
      text: template.slice(recordIndex, end),
    });
    cursor = end;
  }

  return records;
}

function indexOfWord(source, word, start, end) {
  let index = start;
  while (index < end) {
    index = source.indexOf(word, index);
    if (index === -1 || index >= end) {
      return -1;
    }
    const before = index === 0 ? "" : source[index - 1];
    const after = source[index + word.length] ?? "";
    if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) {
      return index;
    }
    index += word.length;
  }
  return -1;
}

function findMatchingBrace(source, openBrace) {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = openBrace; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  throw new Error(`Could not find matching brace for offset ${openBrace}`);
}

function extractLedgerId(recordText) {
  const match = recordText.match(/ledger_id\s*=\s*principal\s+"([^"]+)"/);
  return match?.[1] ?? null;
}

function printDiffPreview(templatePath, nextContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rune-token-template-"));
  const tmpFile = path.join(tmpDir, "token_storage_args.template");
  fs.writeFileSync(tmpFile, nextContent);

  try {
    const diff = spawnSync(
      "git",
      [
        "diff",
        "--no-index",
        "--",
        path.relative(repoRoot, templatePath),
        tmpFile,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    const output = `${diff.stdout}${diff.stderr}`;
    console.log(output || "No diff.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const agent = new HttpAgent({ host: args.host });
  const omnityActor = Actor.createActor(omnityIcpIdlFactory, {
    agent,
    canisterId: Principal.fromText(args.canisterId),
  });

  console.error(`Fetching Omnity token list from ${args.canisterId}`);
  const tokens = await omnityActor.get_token_list();
  const runeTokens = tokens.filter(isRuneToken);
  console.error(`Fetched ${tokens.length} tokens; ${runeTokens.length} Rune tokens matched`);

  const enrichedTokens = await mapLimit(
    runeTokens,
    DEFAULT_CONCURRENCY,
    (token, index, total) => enrichRuneToken(agent, token, index, total),
  );

  const generatedRecords = enrichedTokens
    .sort((left, right) => left.symbol.localeCompare(right.symbol))
    .map((token) => ({
      ledgerId: token.ledgerId,
      text: generateRegistryRecord(token),
    }));

  const template = fs.readFileSync(args.template, "utf8");
  const { appended, output, replaced } = upsertTemplate(template, generatedRecords);

  console.log(
    `Rune token sync summary: fetched=${tokens.length}, runes=${runeTokens.length}, replaced=${replaced}, appended=${appended}`,
  );

  if (args.dryRun) {
    printDiffPreview(args.template, output);
    return;
  }

  fs.writeFileSync(args.template, output);
  console.log(`Updated ${path.relative(repoRoot, args.template)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
