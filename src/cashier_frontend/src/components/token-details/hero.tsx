// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
        <div className="flex flex-col items-center px-4">
            <div className="text-center mb-4">
                <p className="text-[32px] font-semibold leading-tight">
                    {token.amount ? convertDecimalBigIntToNumber(token.amount, token.decimals) : 0}{" "}
                    {token.name}
                </p>
                <p className="text-xs text-grey font-semibold">${token.usdEquivalent}</p>
            </div>

            <div className="mb-5">
                <SendReceive onReceive={handleNavigateReceive} onSend={handleNavigateSend} />
            </div>

            <div className="w-full bg-gray-50 rounded-lg p-4">
                <p className="text-green font-medium mb-3">
                    {t("history.hero.about")} {token.symbol}
                </p>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="font-medium text-sm">{t("history.hero.tokenName")}</p>
                        <p className="text-sm text-grey text-right">{token.name}</p>
                    </div>

                    <div className="flex justify-between items-center">
                        <p className="font-medium text-sm">Fee</p>
                        <p className="text-sm text-grey text-right">{token.fee?.toString()}</p>
                    </div>

                    <div className="flex justify-between items-center">
                        <p className="font-medium text-sm">{t("history.hero.chain")}</p>
                        <p className="text-sm text-grey text-right">
                            {mapChainToPrettyName(token.chain)}
                        </p>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{t("history.hero.contract")}</p>
                            <button
                                onClick={copyAddress}
                                className="hover:opacity-70 transition-opacity"
                            >
                                <CopyIcon className="stroke-green" size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-grey text-right max-w-[200px] truncate">
                            {token.address}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
