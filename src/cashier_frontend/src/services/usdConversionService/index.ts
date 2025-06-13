// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { DevIcExplorerUsdConversionService } from "./devIcExplorerUsdConversion.service";
import { IcExplorerUsdConversionService } from "./icExplorerUsdConversion.service";
import { IUsdConversionService } from "./IUsdConversionService";

export const UsdConversionService: IUsdConversionService =
    import.meta.env.MODE === "production"
        ? new IcExplorerUsdConversionService()
        : new DevIcExplorerUsdConversionService();
