// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { WalletNftsTab } from "./nfts-tab";
import { WalletTokensTab } from "./tokens-tab";
import Tabs from "@/components/ui/tabs2";
import { useState } from "react";
import { Info } from "lucide-react";

export enum WalletTab {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

export function WalletTabs() {
    const { t } = useTranslation();

    const [tab, setTab] = useState<WalletTab>(WalletTab.Tokens);

    const [showToast, setShowToast] = useState<boolean>(false);

    function handleTabChange(newTab: string) {
        if (newTab === WalletTab.Nfts) {
            setShowToast(true);

            setTimeout(() => {
                setShowToast(false);
            }, 5000);
        } else {
            setTab(newTab as WalletTab);
        }
    }

    return (
        <div className="flex flex-col h-full relative">
            <Tabs.Root value={tab} onValueChange={handleTabChange} className="flex flex-col h-full">
                <Tabs.List className="flex-none z-10">
                    <Tabs.Trigger value={WalletTab.Tokens}>
                        {t("wallet.tabs.tokens.header")}
                    </Tabs.Trigger>
                    <Tabs.Trigger value={WalletTab.Nfts}>
                        {t("wallet.tabs.nfts.header")}
                    </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value={WalletTab.Tokens} className="flex-1 h-full">
                    <WalletTokensTab />
                </Tabs.Content>

                <Tabs.Content value={WalletTab.Nfts} className="flex-1 h-full pb-16">
                    <WalletNftsTab />
                </Tabs.Content>
            </Tabs.Root>

            {showToast && (
                <div className="flex gap-3 fixed bottom-9 left-5 right-5 p-4 bg-lightyellow rounded-xl z-20">
                    <Info className="fill-green stroke-lightyellow" size={32} />

                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold">{t("wallet.banner.title")}</p>
                        <p className="text-grey-400 text-sm">{t("wallet.banner.text")}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
