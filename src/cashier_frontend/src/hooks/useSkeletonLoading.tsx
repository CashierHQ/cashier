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

import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";

interface SkeletonLoadingProps {
    count?: number;
    height?: number;
    width?: number;
    maxWidth?: number;
    className?: string;
}

export const useSkeletonLoading = ({
    count = 5,
    height = 3,
    width = 75,
    maxWidth = 320,
    className = "",
}: SkeletonLoadingProps = {}) => {
    const renderSkeleton = React.useCallback(() => {
        return Array.from({ length: count }).map((_, index) => (
            <div className="flex items-center space-x-4 my-3" key={index}>
                <Skeleton className="h-10 w-10 rounded-sm" />
                <div className="space-y-2">
                    <Skeleton
                        className={`h-${height} w-[${width}vw] max-w-[${maxWidth}px] ${className}`}
                    />
                    <Skeleton className="h-3 w-[200px]" />
                </div>
            </div>
        ));
    }, [count, height, width, maxWidth, className]);

    return { renderSkeleton };
};
