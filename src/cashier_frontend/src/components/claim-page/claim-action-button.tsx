import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FixedBottomButton } from "../fix-bottom-button";

interface ClaimActionButtonProps {
    isDisabled?: boolean;
    buttonText?: string;
    onSubmit: () => void;
    setDisabled?: (disabled: boolean) => void;
}

const ClaimActionButton: React.FC<ClaimActionButtonProps> = ({
    isDisabled,
    buttonText,
    onSubmit,
    setDisabled,
}) => {
    const { t } = useTranslation();

    // Ensure we immediately update the button state when isDisabled prop changes
    useEffect(() => {
        // This effect ensures the button's disabled state is controlled by the parent component
        if (setDisabled && isDisabled !== undefined) {
            setDisabled(isDisabled);
        }
    }, [isDisabled, setDisabled]);

    return (
        <FixedBottomButton
            type="submit"
            variant="default"
            size="lg"
            className="w-full mt-auto disabled:bg-disabledgreen"
            disabled={isDisabled}
            onClick={onSubmit}
        >
            {buttonText ?? t("claim.claim")}
        </FixedBottomButton>
    );
};

export default ClaimActionButton;
