import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";
import { Copy, CopyCheck } from "lucide-react";
import { mapChainToPrettyName } from "@/utils/map/chain.map";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useState } from "react";
import { convertDecimalBigIntToNumber } from "@/utils";
import { useNavigate } from "react-router-dom";

interface TokenDetailsHeroProps {
    token: FungibleToken;
}

export function TokenDetailsHero({ token }: TokenDetailsHeroProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const navigateReceivePage = () => navigate(`/wallet/receive/${token.address}`);
    const navigateSendPage = () => navigate(`/wallet/send/${token.address}`);

    const [hasCopiedAddress, setHasCopiedAddress] = useState<boolean>(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(token.address);
        setHasCopiedAddress(true);
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
                <SendReceive onReceive={navigateReceivePage} onSend={navigateSendPage} />
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
