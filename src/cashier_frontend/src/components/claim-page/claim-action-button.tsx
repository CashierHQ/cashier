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

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FixedBottomButton } from "../fix-bottom-button";

interface UseActionButtonProps {
    isDisabled?: boolean;
    buttonText?: string;
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
        <FixedBottomButton
            type="submit"
            variant="default"
            className="w-full mt-auto disabled:bg-disabledgreen"
            disabled={isDisabled}
            onClick={onSubmit}
        >
            {buttonText ?? t("claim.claim")}
        </FixedBottomButton>
    );
};

export default UseActionButton;
