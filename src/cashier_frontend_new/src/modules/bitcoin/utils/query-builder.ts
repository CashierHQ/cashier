import type {
  AvailableUTXO,
  AvailableUTXOResponse,
  UnisatUTXOResponse,
  UTXOWithRunes,
} from "../types";

export async function getRunesList(
  address: string,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<
  Array<{
    runeid: string;
    rune: string;
    spacedRune: string;
    symbol: string;
    divisibility: number;
  }>
> {
  const baseUrl =
    network === "mainnet"
      ? "https://open-api.unisat.io"
      : "https://open-api-testnet.unisat.io";

  try {
    const response = await fetch(
      `${baseUrl}/v1/indexer/address/${address}/runes/balance-list`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Unisat API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Unisat API error: ${data.msg || "Unknown error"}`);
    }

    console.log(`📋 Found ${data.data?.detail?.length || 0} rune types`);

    return data.data?.detail || [];
  } catch (error) {
    console.error("Error fetching runes list:", error);
    return [];
  }
}

// 2. Get UTXOs for a specific rune
export async function getRuneUTXOs(
  address: string,
  runeId: string, // e.g., "840000:3"
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<UTXOWithRunes[]> {
  const baseUrl =
    network === "mainnet"
      ? "https://open-api.unisat.io"
      : "https://open-api-testnet.unisat.io";

  const encodedRuneId = encodeURIComponent(runeId);
  let allUTXOs: UTXOWithRunes[] = [];
  let start = 0;
  const limit = 100; // Max per request

  try {
    while (true) {
      const response = await fetch(
        `${baseUrl}/v1/indexer/address/${address}/runes/${encodedRuneId}/utxo?start=${start}&limit=${limit}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Unisat API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: UnisatUTXOResponse = await response.json();

      if (data.code !== 0) {
        throw new Error(`Unisat API error code: ${data.code}`);
      }

      // Transform to our format
      const utxos = data.data.utxo.map((utxo) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.satoshi,
        scriptPubKey: utxo.scriptPk,
        address: utxo.address,
        height: utxo.height,
        confirmations: utxo.confirmations,
        runes: utxo.runes,
      }));

      allUTXOs = allUTXOs.concat(utxos);

      console.log(
        `📦 Fetched ${utxos.length} UTXOs (total: ${data.data.total})`,
      );

      // Check if we got all UTXOs
      if (start + utxos.length >= data.data.total) {
        break;
      }

      start += limit;
    }

    return allUTXOs;
  } catch (error) {
    console.error(`Error fetching UTXOs for rune ${runeId}:`, error);
    return [];
  }
}

// 3. Get ALL UTXOs with runes for an address
export async function getUTXOsWithRunes(
  address: string,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<UTXOWithRunes[]> {
  console.log("🔍 Fetching runes list...");

  // First, get all rune types this address holds
  const runesList = await getRunesList(address, apiKey, network);

  if (runesList.length === 0) {
    console.log("No runes found for this address");
    return [];
  }

  // Create a map to deduplicate UTXOs (since one UTXO can have multiple runes)
  const utxoMap = new Map<string, UTXOWithRunes>();

  // Fetch UTXOs for each rune type
  for (const rune of runesList) {
    console.log(`🔍 Fetching UTXOs for ${rune.spacedRune} (${rune.runeid})...`);

    const utxos = await getRuneUTXOs(address, rune.runeid, apiKey, network);

    // Merge into map
    for (const utxo of utxos) {
      const key = `${utxo.txid}:${utxo.vout}`;

      if (utxoMap.has(key)) {
        // UTXO already exists, add runes to it
        const existing = utxoMap.get(key)!;
        existing.runes.push(...utxo.runes);
      } else {
        // New UTXO
        utxoMap.set(key, utxo);
      }
    }
  }

  return Array.from(utxoMap.values());
}

export async function getAvailableUTXOs(
  address: string,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
  withLowFee: boolean = false,
): Promise<AvailableUTXO[]> {
  const baseUrl =
    network === "mainnet"
      ? "https://open-api.unisat.io"
      : "https://open-api-testnet.unisat.io";

  let allUTXOs: AvailableUTXO[] = [];
  let cursor = 0;
  const size = 100; // Max per request

  try {
    while (true) {
      const response = await fetch(
        `${baseUrl}/v1/indexer/address/${address}/available-utxo-data?cursor=${cursor}&size=${size}&withLowFee=${withLowFee}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Unisat API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: AvailableUTXOResponse = await response.json();

      if (data.code !== 0) {
        throw new Error(`Unisat API error: ${data.msg || "Unknown error"}`);
      }

      allUTXOs = allUTXOs.concat(data.data.utxo);

      console.log(
        `💰 Fetched ${data.data.utxo.length} available UTXOs (total: ${data.data.total})`,
      );

      // Check if we got all UTXOs
      if (allUTXOs.length >= data.data.total) {
        break;
      }

      cursor += size;
    }

    return allUTXOs;
  } catch (error) {
    console.error("Error fetching available UTXOs:", error);
    return [];
  }
}

export async function getAvailableUTXOsWithMinAmount(
  address: string,
  minAmount: number,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<AvailableUTXO[]> {
  const utxos = await getAvailableUTXOs(address, apiKey, network);

  // Filter for UTXOs with at least minAmount sats
  return utxos.filter((utxo) => utxo.satoshi >= minAmount);
}

// Select UTXOs for a specific amount (coin selection)
export async function selectUTXOsForAmount(
  address: string,
  targetAmount: number,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<{ selectedUTXOs: AvailableUTXO[]; totalAmount: number }> {
  const utxos = await getAvailableUTXOs(address, apiKey, network);

  // Sort by amount descending (largest first - greedy algorithm)
  utxos.sort((a, b) => b.satoshi - a.satoshi);

  const selectedUTXOs: AvailableUTXO[] = [];
  let totalAmount = 0;

  for (const utxo of utxos) {
    selectedUTXOs.push(utxo);
    totalAmount += utxo.satoshi;

    if (totalAmount >= targetAmount) {
      break;
    }
  }

  if (totalAmount < targetAmount) {
    throw new Error(
      `Insufficient funds. Required: ${targetAmount} sats, Available: ${totalAmount} sats`,
    );
  }

  return { selectedUTXOs, totalAmount };
}

export async function getUTXOsForTransfer(
  address: string,
  runeId: string,
  requiredAmount: bigint,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<{ runeUTXOs: UTXOWithRunes[]; totalRuneAmount: bigint }> {
  // Get all UTXOs containing this specific rune
  const utxos = await getRuneUTXOs(address, runeId, apiKey, network);

  if (utxos.length === 0) {
    throw new Error(`No UTXOs found containing rune ${runeId}`);
  }

  let totalRuneAmount = 0n;
  const selectedUTXOs: UTXOWithRunes[] = [];

  // Sort by rune amount descending to minimize UTXO usage
  utxos.sort((a, b) => {
    const aAmount = BigInt(a.runes[0]?.amount || 0);
    const bAmount = BigInt(b.runes[0]?.amount || 0);
    return bAmount > aAmount ? 1 : -1;
  });

  // Select UTXOs until we have enough runes
  for (const utxo of utxos) {
    const runeBalance = utxo.runes.find((r) => r.runeid === runeId);
    if (runeBalance) {
      selectedUTXOs.push(utxo);
      totalRuneAmount += BigInt(runeBalance.amount);

      // We need all runes from selected UTXOs, so continue until we have enough
      if (totalRuneAmount >= requiredAmount) {
        break;
      }
    }
  }

  if (totalRuneAmount < requiredAmount) {
    throw new Error(
      `Insufficient rune balance. Required: ${requiredAmount}, Available: ${totalRuneAmount}`,
    );
  }

  return { runeUTXOs: selectedUTXOs, totalRuneAmount };
}
