// import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";
import { prettyNumber } from "@/utils/helpers/number/pretty";

interface WalletHeroProps {
    totalUsdEquivalent: number;
}

export function WalletHero({ totalUsdEquivalent }: WalletHeroProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center px-4 pt-6 pb-5">
            <h1 className="text-center text-lg font-semibold leading-none">
                {t("wallet.details.header")}
            </h1>

            <div className="relative mt-2.5">
                <span className="text-[32px] font-semibold">
                    ${prettyNumber(totalUsdEquivalent)}
                </span>

                {/* TODO: future release */}
                {/* <button className="absolute ml-2.5 top-1/2 -translate-y-1/2 rounded-full">
                    <Eye size={24} className="stroke-grey" />
                </button> */}
            </div>

            <SendReceive />
        </div>
    );
}
