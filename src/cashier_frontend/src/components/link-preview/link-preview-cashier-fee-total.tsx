// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { useFeeTotal } from "@/hooks/useFeeMetadata";
import { FeeModel } from "@/services/types/intent.service.types";
import { convert } from "@/utils/helpers/convert";
import { useTranslation } from "react-i18next";
import { Spinner } from "../ui/spinner";
import { FC } from "react";
import { useTokenStore } from "@/stores/tokenStore";

type LinkPreviewCashierFeeTotalProps = {
    intents: FeeModel[];
};

const FeeDisplay: FC<{
    totalCashierFee: number | undefined;
    tokenUsdPrice: number | undefined;
    isLoading: boolean;
}> = ({ totalCashierFee, tokenUsdPrice, isLoading }) => {
    if (tokenUsdPrice === undefined && totalCashierFee !== undefined) {
        return (
            <>
                <span>{totalCashierFee}</span>
                <span className="ml-1">{NETWORK_FEE_DEFAULT_SYMBOL}</span>
            </>
        );
    }

    if (
        totalCashierFee === undefined ||
        isLoading ||
        convert(totalCashierFee, tokenUsdPrice)?.toFixed(3) === undefined
    ) {
        return <Spinner width={22} />;
    }

    return (
        <span>
            {!isLoading &&
                tokenUsdPrice !== undefined &&
                `($${convert(totalCashierFee, tokenUsdPrice)?.toFixed(3)}) ≈ `}{" "}
            {totalCashierFee} {NETWORK_FEE_DEFAULT_SYMBOL}
        </span>
    );
};

export const LinkPreviewCashierFeeTotal: FC<LinkPreviewCashierFeeTotalProps> = ({ intents }) => {
    const { t } = useTranslation();
    const totalCashierFee = useFeeTotal(intents);
    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const tokenUsdPrice = getTokenPrice(intents[0].address);
    const isLoading = useTokenStore((state) => state.isLoading || state.isLoadingBalances);

    return (
        <div className="mt-2 flex flex-col gap-3 rounded-xl px-4 py-[0.8rem] bg-lightgreen">
            <div className="flex justify-between items-center font-normal">
                <h6 className="text-sm font-light">{t("link.preview.fees.totalFee")}</h6>
                <div className="flex items-center">
                    <FeeDisplay
                        totalCashierFee={totalCashierFee}
                        tokenUsdPrice={tokenUsdPrice}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
};
