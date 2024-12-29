import { useState, useEffect } from "react";
import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

const useTokenMetadata = (agent: Agent, tokenAddress: string | undefined) => {
    const [metadata, setMetadata] = useState<IcrcTokenMetadata | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { metadata } = IcrcLedgerCanister.create({
                    agent,
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
    }, [agent, tokenAddress]);

    return { metadata, loading, error };
};

export default useTokenMetadata;
