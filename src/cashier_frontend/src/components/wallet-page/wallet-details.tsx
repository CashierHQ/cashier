import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";

export function WalletDetails() {
    const { t } = useTranslation();

    const handleEyeClick = () => {
        console.log("clicked eye icon");
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

            <SendReceive />
        </div>
    );
}
