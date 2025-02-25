import { ArrowDown, ArrowUp, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

export function WalletDetails() {
    const { t } = useTranslation();

    const handleEyeClick = () => {
        console.log("clicked eye icon");
    };

    const handleSendClick = () => {
        console.log("click send");
    };

    const handleReceiveClick = () => {
        console.log("click receive");
    };

    return (
        <div className="flex flex-col items-center px-4 pt-6 pb-5">
            <h1 className="text-center text-lg font-semibold leading-none">
                {t("wallet.details.header")}
            </h1>

            <div className="relative mt-2.5">
                <span className="text-[32px] font-semibold">$4 321</span>

                <button
                    className="absolute ml-2.5 top-1/2 -translate-y-1/2"
                    onClick={handleEyeClick}
                >
                    <Eye size={24} color="#8d8d8d" />
                </button>
            </div>

            <div className="flex gap-6 mt-4">
                <button className="flex flex-col items-center w-14" onClick={handleSendClick}>
                    <div className="bg-lightgreen rounded-full p-2.5">
                        <ArrowUp size={18} />
                    </div>

                    <span className="text-xs mt-1">{t("wallet.details.send")}</span>
                </button>

                <button className="flex flex-col items-center w-14" onClick={handleReceiveClick}>
                    <div className="bg-lightgreen rounded-full p-2.5">
                        <ArrowDown size={18} />
                    </div>

                    <span className="text-xs mt-1">{t("wallet.details.receive")}</span>
                </button>
            </div>
        </div>
    );
}
