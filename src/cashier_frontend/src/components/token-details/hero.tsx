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
import { SendReceive } from "../ui/send-receive";
import { Copy, CopyCheck } from "lucide-react";
import { mapChainToPrettyName } from "@/utils/map/chain.map";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useState } from "react";
import { convertDecimalBigIntToNumber } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useWalletContext } from "@/contexts/wallet-context";
import { toast } from "sonner";

interface TokenDetailsHeroProps {
    token: FungibleToken;
}

export function TokenDetailsHero({ token }: TokenDetailsHeroProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { navigateToPanel } = useWalletContext();

    // Check if we're in a panel context (using a heuristic)
    const isInPanel = window.location.hash === "#/" || !window.location.hash.includes("/wallet/");

    const handleNavigateReceive = () => {
        if (isInPanel) {
            navigateToPanel("receive", { tokenId: token.address });
        } else {
            navigate(`/wallet/receive/${token.address}`);
        }
    };

    const handleNavigateSend = () => {
        if (isInPanel) {
            navigateToPanel("send", { tokenId: token.address });
        } else {
            navigate(`/wallet/send/${token.address}`);
        }
    };

    const [hasCopiedAddress, setHasCopiedAddress] = useState<boolean>(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(token.address);
        setHasCopiedAddress(true);
        toast.success(t("common.sucess.copied_address"));
    };

    const CopyIcon = hasCopiedAddress ? CopyCheck : Copy;

    return (
        <div className="flex flex-col mt-3 items-center">
            <p className="text-[32px] font-semibold">
                {token.amount ? convertDecimalBigIntToNumber(token.amount, token.decimals) : 0}{" "}
                {token.name}
            </p>
            <p className="text-xs text-grey font-semibold">${token.usdEquivalent}</p>

            <div className="mt-4">
                <SendReceive onReceive={handleNavigateReceive} onSend={handleNavigateSend} />
            </div>

            <div className="mt-5 w-full">
                <p className="text-green font-medium">
                    {t("history.hero.about")} {token.symbol}
                </p>

                <div className="flex justify-between gap-2">
                    <p className="font-medium">{t("history.hero.tokenName")}</p>
                    <p className="text-sm text-grey">{token.name}</p>
                </div>

                <div className="flex justify-between gap-2">
                    <p className="font-medium">{t("history.hero.chain")}</p>
                    <p className="text-sm text-grey">{mapChainToPrettyName(token.chain)}</p>
                </div>

                <div className="flex justify-between gap-2">
                    <div className="flex justify-between gap-2.5">
                        <p className="font-medium">{t("history.hero.contract")}</p>
                        <button onClick={copyAddress}>
                            <CopyIcon className="stroke-green" size={16} />
                        </button>
                    </div>

                    <p className="text-sm text-grey">{token.address}</p>
                </div>
            </div>
        </div>
    );
}
