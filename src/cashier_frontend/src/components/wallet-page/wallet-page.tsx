import * as Tabs from "./wallet-tabs";
import { WalletDetails } from "./wallet-details";
import { WalletHeader } from "./wallet-header";
import { useTranslation } from "react-i18next";

export enum WalletTabs {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletPageComponent() {
    const { t } = useTranslation();

    return (
        <>
            <WalletHeader />
            <WalletDetails />

            <Tabs.Root defaultValue={WalletTabs.Tokens}>
                <Tabs.List>
                    <Tabs.Trigger value={WalletTabs.Tokens}>
                        {t("wallet.tabs.tokens.header")}
                    </Tabs.Trigger>
                    <Tabs.Trigger value={WalletTabs.Nfts}>
                        {t("wallet.tabs.nfts.header")}
                    </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value={WalletTabs.Tokens}>Tokens Content</Tabs.Content>
                <Tabs.Content value={WalletTabs.Nfts}>NFT Content</Tabs.Content>
            </Tabs.Root>
        </>
    );
}
