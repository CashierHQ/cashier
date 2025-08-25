// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useEffect } from "react";
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
  // Ensure we immediately update the button state when isDisabled prop changes
  useEffect(() => {
    // This effect ensures the button's disabled state is controlled by the parent component
    if (setDisabled && isDisabled !== undefined) {
      setDisabled(isDisabled);
    }
  }, [isDisabled, setDisabled]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    onSubmit();
  };

  return (
    <Button
      type="button" // Changed from "submit" to "button"
      variant="default"
      className="w-[95%] mx-auto mb-2 mt-auto disabled:bg-disabledgreen"
      disabled={isDisabled}
      onClick={handleClick}
    >
      {buttonText}
    </Button>
  );
};

export default UseActionButton;
