import * as Tabs from "./wallet-tabs";
import { WalletDetails } from "./wallet-details";
import { WalletHeader } from "./wallet-header";
import { useTranslation } from "react-i18next";
import { WalletTokensTab } from "./wallet-tokens-tab";

export enum WalletTab {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletPageComponent() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-dvh">
            <WalletHeader />
            <WalletDetails />

            <Tabs.Root
                defaultValue={WalletTab.Tokens}
                className="flex flex-col flex-grow flex-shrink overflow-hidden"
            >
                <Tabs.List>
                    <Tabs.Trigger value={WalletTab.Tokens}>
                        {t("wallet.tabs.tokens.header")}
                    </Tabs.Trigger>
                    <Tabs.Trigger value={WalletTab.Nfts}>
                        {t("wallet.tabs.nfts.header")}
                    </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content
                    value={WalletTab.Tokens}
                    className="flex-grow flex-shrink overflow-y-auto p-4"
                >
                    <WalletTokensTab />
                </Tabs.Content>

                <Tabs.Content value={WalletTab.Nfts}>NFT Content</Tabs.Content>
            </Tabs.Root>
        </div>
    );
}
