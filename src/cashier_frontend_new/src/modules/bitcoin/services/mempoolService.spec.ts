import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fixtures
const fixture_of_txid_list = ["txid1", "txid2", "txid3"];

const fixture_of_mempool_transaction = {
  txid: "abc123",
  vin: [
    {
      txid: "input1",
      vout: 0,
      prevout: {
        scriptpubkey_type: "v0_p2wpkh",
        scriptpubkey_address: "bc1qsender",
        value: 10000,
      },
    },
  ],
  vout: [
    {
      scriptpubkey_type: "v0_p2wpkh",
      scriptpubkey_address: "bc1qreceiver",
      value: 9000,
    },
  ],
  status: {
    confirmed: true,
    block_height: 840000,
    block_time: 1720000000,
  },
};

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
  });
}

function mockFetchThrow(message: string) {
  return vi.fn().mockRejectedValue(new Error(message));
}

describe("MempoolService", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMempoolTxs", () => {
    it("it_should_fail_get_mempool_txs_due_to_all_endpoints_failing", async () => {
      // Arrange
      vi.doMock("$modules/bitcoin/constants", () => ({
        MEMPOOL_API_BASE_URLS: [
          "https://endpoint1.example.com/api",
          "https://endpoint2.example.com/api",
        ],
      }));
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" });
      vi.stubGlobal("fetch", fetchMock);
      const mod = await import("$modules/bitcoin/services/mempoolService");

      // Act
      const result = await mod.mempoolService.getMempoolTxs();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("it_should_fallback_to_second_url_when_first_fails", async () => {
      // Arrange
      vi.doMock("$modules/bitcoin/constants", () => ({
        MEMPOOL_API_BASE_URLS: [
          "https://endpoint1.example.com/api",
          "https://endpoint2.example.com/api",
        ],
      }));
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve(fixture_of_txid_list),
        });
      vi.stubGlobal("fetch", fetchMock);
      const mod = await import("$modules/bitcoin/services/mempoolService");

      // Act
      const result = await mod.mempoolService.getMempoolTxs();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(fixture_of_txid_list);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("it_should_get_mempool_txs_from_first_url", async () => {
      // Arrange
      vi.doMock("$modules/bitcoin/constants", () => ({
        MEMPOOL_API_BASE_URLS: [
          "https://endpoint1.example.com/api",
          "https://endpoint2.example.com/api",
        ],
      }));
      vi.stubGlobal("fetch", mockFetchOk(fixture_of_txid_list));
      const mod = await import("$modules/bitcoin/services/mempoolService");

      // Act
      const result = await mod.mempoolService.getMempoolTxs();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(fixture_of_txid_list);
    });
  });

  describe("getTransactionById", () => {
    it("it_should_fail_get_transaction_by_id_due_to_network_error", async () => {
      // Arrange
      vi.doMock("$modules/bitcoin/constants", () => ({
        MEMPOOL_API_BASE_URLS: ["https://endpoint1.example.com/api"],
      }));
      vi.stubGlobal("fetch", mockFetchThrow("Network error"));
      const mod = await import("$modules/bitcoin/services/mempoolService");

      // Act
      const result = await mod.mempoolService.getTransactionById("abc123");

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("abc123");
    });

    it("it_should_get_transaction_by_id", async () => {
      // Arrange
      vi.doMock("$modules/bitcoin/constants", () => ({
        MEMPOOL_API_BASE_URLS: ["https://endpoint1.example.com/api"],
      }));
      vi.stubGlobal("fetch", mockFetchOk(fixture_of_mempool_transaction));
      const mod = await import("$modules/bitcoin/services/mempoolService");

      // Act
      const result = await mod.mempoolService.getTransactionById("abc123");

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().txid).toBe("abc123");
      expect(result.unwrap().is_confirmed).toBe(true);
    });
  });
});
