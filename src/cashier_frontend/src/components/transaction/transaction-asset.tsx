import { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Spinner } from "../ui/spinner";

type TransactionAssetProps = {
    title: string;
    isLoading?: boolean;
    displayAmount: number | undefined;
    address: string;
    symbol: string | undefined;
};

export const TransactionAsset: FC<TransactionAssetProps> = ({
    title,
    isLoading,
    displayAmount,
    symbol,
    address,
}) => {
    return (
        <div className="flex justify-between items-center text-md leading-tight">
            <h5 id="transaction-title" className="ml-1.5 text-right">
                {title}
            </h5>

            <div>
                {isLoading ? (
                    <Spinner width={22} />
                ) : (
                    <div className="flex items-center">
                        {`${displayAmount} ${symbol}`}
                        <Avatar className="w-7 h-7 ml-3">
                            <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${address}`} />
                            <AvatarFallback>{symbol}</AvatarFallback>
                        </Avatar>
                    </div>
                )}
            </div>
        </div>
    );
};
