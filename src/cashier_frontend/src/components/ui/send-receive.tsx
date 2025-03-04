import { MoveDown, MoveUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SendReceiveProps {
    onSend?: () => void;
    onReceive?: () => void;
}

export function SendReceive({ onSend = () => {}, onReceive = () => {} }: SendReceiveProps) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-6 mt-4">
            <button className="flex flex-col items-center w-14" onClick={onSend}>
                <div className="bg-lightgreen rounded-full p-2.5">
                    <MoveUp size={18} />
                </div>

                <span className="text-xs mt-1">{t("wallet.details.send")}</span>
            </button>

            <button className="flex flex-col items-center w-14" onClick={onReceive}>
                <div className="bg-lightgreen rounded-full p-2.5">
                    <MoveDown size={18} />
                </div>

                <span className="text-xs mt-1">{t("wallet.details.receive")}</span>
            </button>
        </div>
    );
}
