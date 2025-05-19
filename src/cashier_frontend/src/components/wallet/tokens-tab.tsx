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

import { WalletToken } from "./token-card";
import { Link } from "@/components/ui/link";
import { useTranslation } from "react-i18next";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useWalletContext } from "@/contexts/wallet-context";

interface WalletTokensTab {
    tokens: FungibleToken[];
}

export function WalletTokensTab({ tokens }: WalletTokensTab) {
    const { t } = useTranslation();
    const { navigateToPanel } = useWalletContext();

    const handleManageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigateToPanel("manage");
    };

    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col gap-4 py-4 pb-32">
                    {tokens.map((token) => (
                        <WalletToken key={token.id} token={token} />
                    ))}
                    <button
                        onClick={handleManageClick}
                        className="mx-auto font-normal whitespace-nowrap py-2 text-[#36A18B]"
                    >
                        + {t("wallet.tabs.tokens.manage")}
                    </button>
                </div>
            </div>
        </div>
    );
}
