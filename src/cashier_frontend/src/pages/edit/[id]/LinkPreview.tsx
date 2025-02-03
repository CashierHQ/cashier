import {
    ConfirmationDrawer,
    ConfirmTransactionModel,
} from "@/components/confirmation-drawer/confirmation-drawer";
import { useCashierFeeIntents } from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import LinkCard from "@/components/link-card";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { PartialFormProps } from "@/components/multi-step-form";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/refractor.action.service.types";

import { useState } from "react";
import { useTranslation } from "react-i18next";

interface LinkData {
    title: string;
    image: string;
    description: string;
}

interface LinkPreviewProps extends PartialFormProps<object, LinkData> {
    action: ActionModel | undefined;
    data: ConfirmTransactionModel | undefined;
    onConfirm: () => void;
}

export default function LinkPreview({
    defaultValues,
    handleSubmit,
    onConfirm,
    isDisabled = false,
    linkType,
    action,
    data,
}: LinkPreviewProps) {
    const { t } = useTranslation();
    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const cashierFeeIntents = useCashierFeeIntents(action?.intents);

    const renderLinkCard = () => {
        if (linkType === LINK_TYPE.TIP_LINK) {
            return (
                <LinkCard
                    label="Tip"
                    src="/icpLogo.png"
                    message={LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP}
                    title={defaultValues.title as string}
                />
            );
        }

        return (
            <LinkCard
                label="Claim"
                src={defaultValues.image as string}
                message={defaultValues.description as string}
                title={defaultValues.title as string}
            />
        );
    };

    return (
        <div className="w-full flex flex-col flex-grow">
            {renderLinkCard()}

            <LinkPreviewCashierFeeSection
                intents={cashierFeeIntents}
                onInfoClick={() => setShowInfo(true)}
            />

            <FixedBottomButton
                disabled={isDisabled}
                onClick={() => {
                    setShowConfirmation(true);
                    handleSubmit({});
                }}
            >
                {isDisabled ? t("processing") : t("create.create")}
            </FixedBottomButton>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawer
                data={data}
                open={showConfirmation && !showInfo}
                onClose={() => setShowConfirmation(false)}
                onConfirm={onConfirm}
                onInfoClick={() => setShowInfo(true)}
            />
        </div>
    );
}
