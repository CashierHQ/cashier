// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ComponentProps, FC, ImgHTMLAttributes } from "react";

interface SpinnerProps extends ImgHTMLAttributes<HTMLImageElement> {}

export const Spinner: FC<SpinnerProps> = ({ ...props }) => {
  return <img src="/loading.gif" {...props} />;
};
