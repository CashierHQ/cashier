import { useState, useEffect } from "react";
import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent } from "@dfinity/utils";

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
