import * as Tabs from "./wallet-tabs";
import { WalletDetails } from "./wallet-details";
import { WalletHeader } from "./wallet-header";

export enum WalletTabs {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletPageComponent() {
    return (
        <>
            <WalletHeader />
            <WalletDetails />

            <Tabs.Root defaultValue={WalletTabs.Tokens}>
                <Tabs.List>
                    <Tabs.Trigger value={WalletTabs.Tokens}>Tokens</Tabs.Trigger>
                    <Tabs.Trigger value={WalletTabs.Nfts}>NFTs</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value={WalletTabs.Tokens}>Tokens Content</Tabs.Content>
                <Tabs.Content value={WalletTabs.Nfts}>NFT Content</Tabs.Content>
            </Tabs.Root>
        </>
    );
}
