// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn utility - standard pattern from shadcn/ui
// Ref: https://ui.shadcn.com/docs/installation/manual
export const cn = (...inputs: ClassValue[]): string =>
  twMerge(clsx(inputs));
