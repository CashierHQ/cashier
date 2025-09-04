// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { RiErrorWarningLine } from "react-icons/ri";

interface ErrorMessageWithIconProps {
  message: string;
}

export const ErrorMessageWithIcon: React.FC<ErrorMessageWithIconProps> = ({
  message,
}) => {
  return (
    <div className="flex items-start gap-1.5 mt-2 text-[0.9rem] font-normal text-destructive">
      <RiErrorWarningLine className="text-destructive min-w-5 h-5" />
      <span>{message}</span>
    </div>
  );
};
