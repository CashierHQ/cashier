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

import { FeeModel } from "@/services/types/intent.service.types";
import { FC } from "react";
import { Spinner } from "../ui/spinner";
import { Asset } from "../ui/asset";
import { useTranslation } from "react-i18next";
import { useFeeMetadata } from "@/hooks/useFeeMetadata";
import { useTokens } from "@/hooks/useTokens";

type LinkPreviewCashierFeeItemProps = {
    feeModel: FeeModel;
};

export const LinkPreviewCashierFeeItem: FC<LinkPreviewCashierFeeItemProps> = ({ feeModel }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSrc } = useFeeMetadata(feeModel);

    const { getToken } = useTokens();
    const token = getToken(feeModel.address);

    return (
        <>
            {isLoadingMetadata ? (
                <Spinner width={22} />
            ) : (
                <Asset
                    token={token}
                    title={t("link.preview.fees.creationFee")}
                    amount={assetAmount}
                    src={assetSrc}
                />
            )}
        </>
    );
};
