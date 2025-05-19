// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { prettyNumber } from "./pretty";

describe("prettyNumber", () => {
    it("should format a number with default options", () => {
        const result = prettyNumber(1234567.89);
        expect(result).toBe("1 234 567.89");
    });

    it("should allow custom decimal places", () => {
        const result = prettyNumber(1234567.895, { decimals: 2 });
        expect(result).toBe("1 234 567.89");
    });

    it('should pad decimals with 0 if "pad" is true', () => {
        const result = prettyNumber(1234567.8, { decimals: 3, pad: true });
        expect(result).toBe("1 234 567.800");
    });

    it("should use custom decimal separator", () => {
        const result = prettyNumber(1234567.89, { decimalSeparator: "," });
        expect(result).toBe("1 234 567,89");
    });

    it("should use custom readability separator", () => {
        const result = prettyNumber(1234567.89, { readabilitySeparator: "," });
        expect(result).toBe("1,234,567.89");
    });

    it("should not show trailing zeroes by default", () => {
        const result = prettyNumber(1234567, { decimals: 2 });
        expect(result).toBe("1 234 567");
    });

    it("should handle negative numbers correctly", () => {
        const result = prettyNumber(-1234567.89, { decimals: 2 });
        expect(result).toBe("-1 234 567.89");
    });

    it("should format numbers with large decimal parts correctly", () => {
        const result = prettyNumber(1234567.987654321, { decimals: 4 });
        expect(result).toBe("1 234 567.9876");
    });
});
