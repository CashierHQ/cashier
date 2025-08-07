// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { prettyNumber } from "./pretty";

describe("prettyNumber", () => {
    it("should format a number with default options", () => {
        const result = prettyNumber(1234567.89);
        expect(result).toBe("1,234,567.89");
    });

    it("should allow custom decimal places", () => {
        const result = prettyNumber(1234567.895, { decimals: 2 });
        expect(result).toBe("1,234,567.89");
    });

    it('should pad decimals with 0 if "pad" is true', () => {
        const result = prettyNumber(1234567.8, { decimals: 3, pad: true });
        expect(result).toBe("1,234,567.800");
    });

    it("should use custom decimal separator", () => {
        const result = prettyNumber(1234567.89, { decimalSeparator: " " });
        expect(result).toBe("1,234,567 89");
    });

    it("should use custom readability separator", () => {
        const result = prettyNumber(1234567.89, { readabilitySeparator: " " });
        expect(result).toBe("1 234 567.89");
    });

    it("should not show trailing zeroes by default", () => {
        const result = prettyNumber(1234567, { decimals: 2 });
        expect(result).toBe("1,234,567");
    });

    it("should handle negative numbers correctly", () => {
        const result = prettyNumber(-1234567.89, { decimals: 2 });
        expect(result).toBe("-1,234,567.89");
    });

    it("should format numbers with large decimal parts correctly", () => {
        const result = prettyNumber(1234567.987654321, { decimals: 4 });
        expect(result).toBe("1,234,567.9876");
    });
});
