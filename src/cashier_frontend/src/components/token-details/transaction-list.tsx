import { ComponentProps, forwardRef, HTMLProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types/transaction-type";
import { mapTransactionTypeToTransactionItemComponent } from "@/utils/map/transaction-type.map";
import { formatDate } from "@/utils/helpers/datetime";
import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export const TransactionHistory = forwardRef<HTMLUListElement, HTMLProps<HTMLUListElement>>(
    ({ className, ...props }, ref) => {
        return (
            <ul ref={ref} className={cn("flex flex-col gap-4 w-full py-4", className)} {...props} />
        );
    },
);
TransactionHistory.displayName = "TransactionHistory";

export interface TransactionHistoryItemBaseProps {
    icon?: ReactNode;
    text?: string;
    subtext?: string;
    amount?: string;
    usdEquivalent?: string;
}

export const TransactionHistoryItemBase = ({
    icon,
    text,
    subtext,
    amount,
    usdEquivalent,
}: TransactionHistoryItemBaseProps) => {
    return (
        <li className="flex flex-row justify-between items-center">
            <div className="flex flex-row gap-3">
                {icon !== undefined && (
                    <div className="flex flex-row justify-center items-center w-9 h-9 rounded-full bg-lightgreen">
                        {icon}
                    </div>
                )}

                <div className="flex flex-col justify-between">
                    <p className="text-sm leading-tight">{text}</p>
                    <p className="text-[10px] leading-tight text-grey">{subtext}</p>
                </div>
            </div>

            <div className="flex flex-col justify-between items-end">
                <p className="leading-tight">{amount}</p>
                <p className="text-[10px] leading-tight text-grey">{usdEquivalent}</p>
            </div>
        </li>
    );
};

export const TransactionHistoryItemSend = () => {
    const { t } = useTranslation();

    return (
        <TransactionHistoryItemBase
            icon={<MoveUpRight size={18} />}
            text={t("history.item.send")}
            subtext={`${t("history.item.to")}: bc1qvgtcv.....t3c2sa`}
            amount={`-60`}
            usdEquivalent={`$65.33`}
        />
    );
};

export const TransactionHistoryItemReceive = () => {
    const { t } = useTranslation();

    return (
        <TransactionHistoryItemBase
            icon={<MoveDownLeft size={18} />}
            text={t("history.item.receive")}
            subtext={`${t("history.item.from")}: bc1qvgtcv.....t3c2sa`}
            amount={`+60`}
            usdEquivalent={`$65.33`}
        />
    );
};

export interface TransactionHistoryItemProps extends ComponentProps<"li"> {
    type: TransactionType;
}

export const TransactionHistoryItem = forwardRef<HTMLLIElement, TransactionHistoryItemProps>(
    ({ type, ...props }, ref) => {
        const C = mapTransactionTypeToTransactionItemComponent(type);

        return <C ref={ref} {...props} />;
    },
);
TransactionHistoryItem.displayName = "TransactionHistoryItem";

export interface TransactionHistoryTimestampProps extends Omit<ComponentProps<"p">, "children"> {
    date: Date;
}

export const TransactionHistoryTimestamp = forwardRef<
    HTMLParagraphElement,
    TransactionHistoryTimestampProps
>(({ date, className, ...props }, ref) => {
    return (
        <p ref={ref} className={cn("text-grey text-sm", className)} {...props}>
            {formatDate(date)}
        </p>
    );
});
TransactionHistoryTimestamp.displayName = "TransactionHistoryTimestamp";

export default {
    Root: TransactionHistory,
    Timestamp: TransactionHistoryTimestamp,
    Item: TransactionHistoryItem,
};
