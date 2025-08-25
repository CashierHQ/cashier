// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ComponentProps, forwardRef, HTMLProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types/transaction-type";
import { mapTransactionTypeToTransactionItemComponent } from "@/utils/map/transaction-type.map";
import { formatDate } from "@/utils/helpers/date/pretty";
import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TransactionRecord } from "@/types/transaction-record.speculative";

const TransactionHistory = forwardRef<
  HTMLUListElement,
  HTMLProps<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn("flex flex-col gap-4 w-full py-4", className)}
      {...props}
    />
  );
});
TransactionHistory.displayName = "TransactionHistory";

interface TransactionHistoryItemBaseProps {
  icon?: ReactNode;
  text?: string;
  subtext?: string;
  amount?: string;
  usdEquivalent?: string;
}

const TransactionHistoryItemBase = ({
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

export function TransactionHistoryItemSend({
  record,
}: {
  record: TransactionRecord;
}) {
  const { t } = useTranslation();

  return (
    <TransactionHistoryItemBase
      icon={<MoveUpRight size={18} />}
      text={t("history.item.send")}
      subtext={`${t("history.item.to")}: ${record.to.address}`}
      amount={`-${record.amount}`}
      usdEquivalent={`$${record.usdEquivalent}`}
    />
  );
}

export function TransactionHistoryItemReceive({
  record,
}: {
  record: TransactionRecord;
}) {
  const { t } = useTranslation();

  return (
    <TransactionHistoryItemBase
      icon={<MoveDownLeft size={18} />}
      text={t("history.item.receive")}
      subtext={`${t("history.item.from")}: ${record.to.address}`}
      amount={`+${record.amount}`}
      usdEquivalent={`$${record.usdEquivalent}`}
    />
  );
}

interface TransactionHistoryItemProps extends ComponentProps<"li"> {
  record: TransactionRecord;
}

const TransactionHistoryItem = ({
  record,
  ...props
}: TransactionHistoryItemProps) => {
  const C = mapTransactionTypeToTransactionItemComponent(record.type);

  return <C record={record} />;
};
TransactionHistoryItem.displayName = "TransactionHistoryItem";

interface TransactionHistoryTimestampProps
  extends Omit<ComponentProps<"p">, "children"> {
  date: Date;
}

const TransactionHistoryTimestamp = forwardRef<
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
