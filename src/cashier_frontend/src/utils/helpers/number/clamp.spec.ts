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

import { clampMax, clampMin, clamp } from "./clamp";

describe("clampMax", () => {
    it("should return the value if it is less than or equal to max", () => {
        expect(clampMax(5, 10)).toBe(5);
        expect(clampMax(10, 10)).toBe(10);
    });

    it("should return max if value is greater than max", () => {
        expect(clampMax(15, 10)).toBe(10);
    });
});

describe("clampMin", () => {
    it("should return the value if it is greater than or equal to min", () => {
        expect(clampMin(5, 2)).toBe(5);
        expect(clampMin(2, 2)).toBe(2);
    });

    it("should return min if value is less than min", () => {
        expect(clampMin(1, 2)).toBe(2);
    });
});

describe("clamp", () => {
    it("should return the value if it is within the range", () => {
        expect(clamp(5, 2, 10)).toBe(5);
    });

    it("should return min if value is less than min", () => {
        expect(clamp(1, 2, 10)).toBe(2);
    });

    it("should return max if value is greater than max", () => {
        expect(clamp(15, 2, 10)).toBe(10);
    });
});
