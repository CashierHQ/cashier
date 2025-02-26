import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface TransactionItemBaseProps {
    icon?: ReactNode;
    text?: string;
    subtext?: string;
    amount?: string;
    usdEquivalent?: string;
}

export function TransactionItemBase({
    icon,
    text,
    subtext,
    amount,
    usdEquivalent,
}: TransactionItemBaseProps) {
    return (
        <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row gap-3">
                {icon !== undefined && (
                    <div className="flex flex-row justify-center items-center w-9 h-9 rounded-full bg-lightgreen">
                        {icon}
                    </div>
                )}

                <div className="flex flex-col justify-between">
                    <p className="text-sm leading-tight">{text}</p>
                    <p className="text-[10px] leading-tight">{subtext}</p>
                </div>
            </div>

            <div className="flex flex-col justify-between items-end">
                <p className="leading-tight">{amount}</p>
                <p className="text-[10px] leading-tight">{usdEquivalent}</p>
            </div>
        </div>
    );
}

export function TransactionItemSend() {
    const { t } = useTranslation();

    return (
        <TransactionItemBase
            icon={<MoveUpRight size={18} />}
            text={t("history.item.send")}
            subtext={`${t("history.item.to")}: bc1qvgtcv.....t3c2sa`}
            amount={`-60`}
            usdEquivalent={`$65.33`}
        />
    );
}

export function TransactionItemReceive() {
    const { t } = useTranslation();

    return (
        <TransactionItemBase
            icon={<MoveDownLeft size={18} />}
            text={t("history.item.receive")}
            subtext={`${t("history.item.from")}: bc1qvgtcv.....t3c2sa`}
            amount={`+60`}
            usdEquivalent={`$65.33`}
        />
    );
}
