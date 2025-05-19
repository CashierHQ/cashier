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

import { useTranslation } from "react-i18next";
import { WalletNftsTab } from "./nfts-tab";
import { WalletTokensTab } from "./tokens-tab";
import Tabs from "@/components/ui/tabs2";
import { useState } from "react";
import { Info } from "lucide-react";
import { FungibleToken } from "@/types/fungible-token.speculative";

export enum WalletTab {
    Tokens = "Tokens",
    Nfts = "NFTs",
}

interface WalletTabsProps {
    fungibleTokens: FungibleToken[];
}

export function WalletTabs({ fungibleTokens }: WalletTabsProps) {
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
                    <WalletTokensTab tokens={fungibleTokens} />
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
