import { FC } from "react";
import { Spinner } from "./spinner";

export type FeeProps = {
    title?: string | undefined;
    amount?: number | undefined;
    symbol?: string | undefined;

    isLoading?: boolean;
};

export const Fee: FC<FeeProps> = ({ title, amount, symbol, isLoading }) => {
    return (
        <div className="flex justify-between text-xs leading-tight">
            <h6 id="transaction-title" className="text-right">
                {title}
            </h6>

            <div className="flex">
                {isLoading ? (
                    <Spinner width={22} />
                ) : (
                    <div className="flex">
                        + {amount} {symbol}
                    </div>
                )}
            </div>
        </div>
    );
};
