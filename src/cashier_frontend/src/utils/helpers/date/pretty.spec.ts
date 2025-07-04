// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { formatDate } from "./pretty";

describe("formatDate", () => {
    it("should format the date correctly for en-US locale", () => {
        const date = new Date("2025-03-02");
        expect(formatDate(date)).toBe("Mar 2, 2025");
    });
});
