import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";
import { Copy } from "lucide-react";
import { mapChainToPrettyName } from "@/utils/map/chain.map";
import { Chain } from "@/services/types/link.service.types";

export function TokenDetailsHero() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col mt-3 items-center">
            <p className="text-[32px] font-semibold">60 Kinic</p>
            <p className="text-xs text-grey font-semibold">$65.33</p>

            <div className="mt-4">
                <SendReceive />
            </div>

            <div className="mt-5 w-full">
                <p className="text-green font-medium">{t("history.hero.about")} KINIC</p>

                <div className="flex justify-between gap-2">
                    <p className="font-medium">{t("history.hero.tokenName")}</p>
                    <p className="text-sm text-grey">Kinic</p>
                </div>

                <div className="flex justify-between gap-2">
                    <p className="font-medium">{t("history.hero.chain")}</p>
                    <p className="text-sm text-grey">{mapChainToPrettyName(Chain.IC)}</p>
                </div>

                <div className="flex justify-between gap-2">
                    <div className="flex justify-between gap-2.5">
                        <p className="font-medium">{t("history.hero.contract")}</p>
                        <button>
                            <Copy className="stroke-green" size={16} />
                        </button>
                    </div>

                    <p className="text-sm text-grey">-</p>
                </div>
            </div>
        </div>
    );
}
