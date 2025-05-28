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

import type { PermissionScope, PermissionState, SupportedStandard } from "@slide-computer/signer";

export const supportedStandards: SupportedStandard[] = [
    {
        name: "ICRC-25",
        url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-25/ICRC-25.md",
    },
    {
        name: "ICRC-34",
        url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-34/ICRC-34.md",
    },
    {
        name: "ICRC-112",
        url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-34/ICRC-34.md",
    },
];

export const scopes: Array<{
    scope: PermissionScope;
    state: PermissionState;
}> = [
    {
        scope: {
            method: "icrc34_delegation",
        },
        state: "granted",
    },
];
