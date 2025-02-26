import { useTranslation } from "react-i18next";
import { WalletNftsTab } from "./nfts-tab";
import { WalletTokensTab } from "./tokens-tab";
import Tabs from "@/components/ui/tabs2";

export enum WalletTab {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletTabs() {
    const { t } = useTranslation();

    return (
        <Tabs.Root
            defaultValue={WalletTab.Tokens}
            className="flex flex-col flex-grow flex-shrink overflow-hidden"
        >
            <Tabs.List>
                <Tabs.Trigger value={WalletTab.Tokens}>
                    {t("wallet.tabs.tokens.header")}
                </Tabs.Trigger>
                <Tabs.Trigger value={WalletTab.Nfts}>{t("wallet.tabs.nfts.header")}</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value={WalletTab.Tokens}>
                <WalletTokensTab />
            </Tabs.Content>

            <Tabs.Content value={WalletTab.Nfts}>
                <WalletNftsTab />
            </Tabs.Content>
        </Tabs.Root>
    );
}
