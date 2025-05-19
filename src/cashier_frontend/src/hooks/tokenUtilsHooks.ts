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

import { useState, useEffect } from "react";
import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent } from "@dfinity/utils";

/**
 *
 * @deprecated this can replace by useTokens hook
 */
const useTokenMetadata = (tokenAddress: string | undefined) => {
    const [metadata, setMetadata] = useState<IcrcTokenMetadata | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const anonymousAgent = defaultAgent();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { metadata } = IcrcLedgerCanister.create({
                    agent: anonymousAgent,
                    canisterId: Principal.fromText(tokenAddress ?? ""),
                });
                const data = await metadata({});
                const result = mapTokenMetadata(data);
                setMetadata(result);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, [tokenAddress]);

    return { metadata, loading, error, anonymousAgent };
};

export default useTokenMetadata;
