// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FixedBottomButton } from "../fix-bottom-button";
import { Button } from "../ui/button";

interface UseActionButtonProps {
    isDisabled?: boolean;
    buttonText: string;
    onSubmit: () => void;
    setDisabled?: (disabled: boolean) => void;
}

const UseActionButton: React.FC<UseActionButtonProps> = ({
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
        <Button
            type="submit"
            variant="default"
            className="w-[95%] mx-auto mb-2 mt-auto disabled:bg-disabledgreen"
            disabled={isDisabled}
            onClick={onSubmit}
        >
            {buttonText}
        </Button>
    );
};

export default UseActionButton;
