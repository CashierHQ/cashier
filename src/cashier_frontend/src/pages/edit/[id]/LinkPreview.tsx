import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { useCashierFeeIntents } from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import LinkCard from "@/components/link-card";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { Button } from "@/components/ui/button";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useCreateAction } from "@/hooks/linkHooks";
import useToast from "@/hooks/useToast";
import { getCashierError, isCashierError } from "@/services/errorProcess.service";

export default function LinkPreview() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const { link, action, setAction } = useCreateLinkStore();

    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    const cashierFeeIntents = useCashierFeeIntents(action?.intents);
    const { mutateAsync: createAction } = useCreateAction();

    const showInvalidActionToast = () => {
        showToast(
            t("transaction.validation.action_failed"),
            t("transaction.validation.action_failed_message"),
            "error",
        );
    };

    const showCashierErrorToast = (error: Error) => {
        const cahierError = getCashierError(error);

        showToast(t("transaction.create_intent.action_failed"), cahierError.message, "error");
    };

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
                await handleCreateAction();
                setShowConfirmation(true);
            } else {
                showInvalidActionToast();
            }
        } catch (error) {
            if (isCashierError(error)) {
                showCashierErrorToast(error);
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
        <div className="w-full flex flex-col flex-grow">
            {renderLinkCard()}

            <LinkPreviewCashierFeeSection
                intents={cashierFeeIntents}
                onInfoClick={() => setShowInfo(true)}
            />

            <Button disabled={isDisabled} onClick={handleSubmit} className="my-3">
                {isDisabled ? t("processing") : t("create.create")}
            </Button>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawer
                open={showConfirmation && !showInfo}
                onClose={() => setShowConfirmation(false)}
                onInfoClick={() => setShowInfo(true)}
            />
        </div>
    );
}
