import * as Tabs from "./wallet-tabs";
import { WalletDetails } from "./wallet-details";
import { useTranslation } from "react-i18next";
import { WalletTokensTab } from "./wallet-tokens-tab";
import { WalletNftsTab } from "./wallet-nfts-tab";

export enum WalletTab {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletPage() {
    const { t } = useTranslation();

    return (
        <>
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

                <Tabs.Content value={WalletTab.Tokens}>
                    <WalletTokensTab />
                </Tabs.Content>

                <Tabs.Content value={WalletTab.Nfts}>
                    <WalletNftsTab />
                </Tabs.Content>
            </Tabs.Root>
        </>
    );
}
