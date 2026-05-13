import { describe, it, expect } from "vitest";
import { createDeduplicationMemo32 } from "./memo32";

describe("createDeduplicationMemo32", () => {
  describe("output shape", () => {
    it("it_should_return_uint8array_of_32_bytes_for_empty_string", () => {
      const result = createDeduplicationMemo32("");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(32);
    });

    it("it_should_return_uint8array_of_32_bytes_for_short_string", () => {
      const result = createDeduplicationMemo32("hello");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(32);
    });

    it("it_should_return_uint8array_of_32_bytes_for_unicode_string", () => {
      const result = createDeduplicationMemo32("hello 🌍");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(32);
    });

    it("it_should_return_uint8array_of_32_bytes_for_long_string", () => {
      const longInput = "a".repeat(1_000);
      const result = createDeduplicationMemo32(longInput);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(32);
    });
  });

  describe("determinism", () => {
    it("it_should_return_identical_bytes_when_called_twice_with_same_input", () => {
      const first = createDeduplicationMemo32("hello world");
      const second = createDeduplicationMemo32("hello world");

      expect(first).toEqual(second);
    });

    it("it_should_return_identical_bytes_for_empty_string_on_repeated_calls", () => {
      const first = createDeduplicationMemo32("");
      const second = createDeduplicationMemo32("");

      expect(first).toEqual(second);
    });
  });

  describe("collision resistance", () => {
    it("it_should_produce_different_bytes_for_different_single_char_inputs", () => {
      const resultA = createDeduplicationMemo32("a");
      const resultB = createDeduplicationMemo32("b");

      expect(resultA).not.toEqual(resultB);
    });

    it("it_should_produce_different_bytes_for_empty_vs_non_empty_input", () => {
      const empty = createDeduplicationMemo32("");
      const nonEmpty = createDeduplicationMemo32("a");

      expect(empty).not.toEqual(nonEmpty);
    });

    it("it_should_produce_different_bytes_for_short_vs_long_input", () => {
      const short = createDeduplicationMemo32("abc");
      const long = createDeduplicationMemo32("abc".repeat(100));

      expect(short).not.toEqual(long);
    });

    it("it_should_produce_different_bytes_for_inputs_differing_only_in_order", () => {
      const forward = createDeduplicationMemo32("ab");
      const reversed = createDeduplicationMemo32("ba");

      expect(forward).not.toEqual(reversed);
    });
  });

  describe("edge cases", () => {
    it("it_should_not_return_all_zeros_for_empty_string", () => {
      const result = createDeduplicationMemo32("");
      const allZeros = new Uint8Array(32);

      expect(result).not.toEqual(allZeros);
    });

    it("it_should_handle_multibyte_unicode_characters", () => {
      // 🌍 encodes to 4 bytes in UTF-8; result must still be 32 bytes
      const result = createDeduplicationMemo32("🌍");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(32);
    });

    it("it_should_treat_unicode_strings_with_same_codepoints_as_equal", () => {
      const first = createDeduplicationMemo32("café");
      const second = createDeduplicationMemo32("café");

      expect(first).toEqual(second);
    });
  });

  describe("known regression vectors (SHA-256)", () => {
    it("it_should_produce_sha256_of_empty_string", () => {
      // SHA-256("")
      const expected = new Uint8Array([
        227, 176, 196, 66, 152, 252, 28, 20, 154, 251, 244, 200, 153, 111, 185,
        36, 39, 174, 65, 228, 100, 155, 147, 76, 164, 149, 153, 27, 120, 82,
        184, 85,
      ]);

      expect(createDeduplicationMemo32("")).toEqual(expected);
    });

    it("it_should_produce_sha256_of_hello", () => {
      // SHA-256("hello")
      const expected = new Uint8Array([
        44, 242, 77, 186, 95, 176, 163, 14, 38, 232, 59, 42, 197, 185, 226, 158,
        27, 22, 30, 92, 31, 167, 66, 94, 115, 4, 51, 98, 147, 139, 152, 36,
      ]);

      expect(createDeduplicationMemo32("hello")).toEqual(expected);
    });

    it("it_should_produce_sha256_of_hello_with_emoji", () => {
      // SHA-256("hello 🌍")
      const expected = new Uint8Array([
        146, 222, 107, 191, 165, 46, 108, 250, 15, 133, 145, 111, 216, 23, 108,
        177, 100, 75, 149, 164, 192, 20, 140, 221, 169, 71, 69, 186, 108, 53,
        229, 235,
      ]);

      expect(createDeduplicationMemo32("hello 🌍")).toEqual(expected);
    });
  });
});
