// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Skeleton } from "@/components/ui/skeleton";

export const AssetFormSkeleton = () => {
  return Array.from({ length: 5 }).map((_, index) => (
    <div className="flex items-center space-x-4 my-3" key={index}>
      <Skeleton className="h-10 w-10 rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
  ));
};
