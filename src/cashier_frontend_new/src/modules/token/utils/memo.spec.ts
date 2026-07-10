import { describe, it, expect } from "vitest";
import { createDeduplicationMemo } from "$modules/token/utils/memo";

describe("createDeduplicationMemo", () => {
  describe("output shape", () => {
    it("it_should_return_uint8array_of_16_bytes_for_empty_string", () => {
      const result = createDeduplicationMemo("");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });

    it("it_should_return_uint8array_of_16_bytes_for_short_string", () => {
      const result = createDeduplicationMemo("hello");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });

    it("it_should_return_uint8array_of_16_bytes_for_unicode_string", () => {
      const result = createDeduplicationMemo("hello 🌍");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });

    it("it_should_return_uint8array_of_16_bytes_for_long_string", () => {
      const longInput = "a".repeat(1_000);
      const result = createDeduplicationMemo(longInput);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });
  });

  describe("determinism", () => {
    it("it_should_return_identical_bytes_when_called_twice_with_same_input", () => {
      const first = createDeduplicationMemo("hello world");
      const second = createDeduplicationMemo("hello world");

      expect(first).toEqual(second);
    });

    it("it_should_return_identical_bytes_for_empty_string_on_repeated_calls", () => {
      const first = createDeduplicationMemo("");
      const second = createDeduplicationMemo("");

      expect(first).toEqual(second);
    });
  });

  describe("collision resistance", () => {
    it("it_should_produce_different_bytes_for_different_single_char_inputs", () => {
      const resultA = createDeduplicationMemo("a");
      const resultB = createDeduplicationMemo("b");

      expect(resultA).not.toEqual(resultB);
    });

    it("it_should_produce_different_bytes_for_empty_vs_non_empty_input", () => {
      const empty = createDeduplicationMemo("");
      const nonEmpty = createDeduplicationMemo("a");

      expect(empty).not.toEqual(nonEmpty);
    });

    it("it_should_produce_different_bytes_for_short_vs_long_input", () => {
      const short = createDeduplicationMemo("abc");
      const long = createDeduplicationMemo("abc".repeat(100));

      expect(short).not.toEqual(long);
    });

    it("it_should_produce_different_bytes_for_inputs_differing_only_in_order", () => {
      const forward = createDeduplicationMemo("ab");
      const reversed = createDeduplicationMemo("ba");

      expect(forward).not.toEqual(reversed);
    });
  });

  describe("edge cases", () => {
    it("it_should_not_return_all_zeros_for_empty_string", () => {
      const result = createDeduplicationMemo("");
      const allZeros = new Uint8Array(16);

      expect(result).not.toEqual(allZeros);
    });

    it("it_should_handle_multibyte_unicode_characters", () => {
      // 🌍 encodes to 4 bytes in UTF-8; result must still be 16 bytes
      const result = createDeduplicationMemo("🌍");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });

    it("it_should_treat_unicode_strings_with_same_codepoints_as_equal", () => {
      const first = createDeduplicationMemo("café");
      const second = createDeduplicationMemo("café");

      expect(first).toEqual(second);
    });
  });

  describe("known regression vectors (SHA-256, first 16 bytes)", () => {
    it("it_should_produce_truncated_sha256_of_empty_string", () => {
      // First 16 bytes of SHA-256("")
      const expected = new Uint8Array([
        227, 176, 196, 66, 152, 252, 28, 20, 154, 251, 244, 200, 153, 111, 185,
        36,
      ]);

      expect(createDeduplicationMemo("")).toEqual(expected);
    });

    it("it_should_produce_truncated_sha256_of_hello", () => {
      // First 16 bytes of SHA-256("hello")
      const expected = new Uint8Array([
        44, 242, 77, 186, 95, 176, 163, 14, 38, 232, 59, 42, 197, 185, 226, 158,
      ]);

      expect(createDeduplicationMemo("hello")).toEqual(expected);
    });

    it("it_should_produce_truncated_sha256_of_hello_with_emoji", () => {
      // First 16 bytes of SHA-256("hello 🌍")
      const expected = new Uint8Array([
        146, 222, 107, 191, 165, 46, 108, 250, 15, 133, 145, 111, 216, 23, 108,
        177,
      ]);

      expect(createDeduplicationMemo("hello 🌍")).toEqual(expected);
    });
  });
});
