import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { useCashierFeeIntents } from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import LinkCard from "@/components/link-card";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useCreateAction, useFeePreview } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { MOCK_CASHIER_FEES } from "@/constants/mock-data";
import { FeeModel } from "@/services/types/intent.service.types";

export interface LinkPreviewProps {
    onInvalidActon?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
}

export default function LinkPreview({
    onInvalidActon = () => {},
    onCashierError = () => {},
    onActionResult,
}: LinkPreviewProps) {
    const { t } = useTranslation();

    const { link, action, setAction } = useCreateLinkStore();

    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { mutateAsync: createAction } = useCreateAction();

    const { data: feeData } = useFeePreview(link?.id);

    const handleCreateAction = async () => {
        const updatedAction = await createAction({
            linkId: link!.id,
        });

        setAction(updatedAction);
    };

    const handleSubmit = async () => {
        const validationResult = true;

        setIsDisabled(true);

        try {
            if (validationResult) {
                if (!action) {
                    await handleCreateAction();
                }

                setShowConfirmation(true);
            } else {
                onInvalidActon();
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }

            console.log("🚀 ~ handleSubmit ~ error:", error);
        } finally {
            setIsDisabled(false);
        }
    };

    const renderLinkCard = () => {
        if (!link) return null;

        if (link.linkType === LINK_TYPE.TIP_LINK) {
            return (
                <LinkCard
                    label="Tip"
                    src="/icpLogo.png"
                    message={LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP}
                    title={link.title}
                />
            );
        }

        return (
            <LinkCard
                label="Claim"
                src={link.image}
                message={link.description}
                title={link.title}
            />
        );
    };

    return (
        <div className="w-full flex flex-col">
            <h2 className="text-sm font-medium leading-6 text-gray-900 ml-2">
                {t("create.preview")}
            </h2>
            {renderLinkCard()}

            <LinkPreviewCashierFeeSection
                intents={feeData ?? []}
                onInfoClick={() => setShowInfo(true)}
            />

            <FixedBottomButton
                type="submit"
                variant="default"
                size="lg"
                onClick={handleSubmit}
                disabled={isDisabled}
            >
                {isDisabled ? t("processing") : t("create.create")}
            </FixedBottomButton>

            {/* <Button disabled={isDisabled} onClick={handleSubmit} className="my-3">
                {isDisabled ? t("processing") : t("create.create")}
            </Button> */}

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawer
                open={showConfirmation && !showInfo}
                onClose={() => setShowConfirmation(false)}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
            />
        </div>
    );
}
