// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useState, useEffect, memo } from "react";
import { useImageCache } from "@/contexts/image-cache-context";
import { Skeleton } from "@/components/ui/skeleton";

interface CachedImageProps {
    src: string;
    alt: string;
    className?: string;
    fallback?: React.ReactNode;
}

const CachedImage: React.FC<CachedImageProps> = ({ src, alt, className, fallback }) => {
    const { getCachedImage, preloadImage } = useImageCache();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        // Skip if src is empty
        if (!src) {
            setError(true);
            setLoading(false);
            return;
        }

        const cached = getCachedImage(src);

        if (cached) {
            setImageUrl(cached);
            setLoading(false);
            return;
        }

        setLoading(true);

        preloadImage(src)
            .then(() => {
                setImageUrl(src);
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }, [src, getCachedImage, preloadImage]);

    if (loading) {
        return <Skeleton className={`${className || "h-10 w-10"}`} />;
    }

    if (error || !imageUrl) {
        return fallback || <div className={`bg-gray-200 ${className || "h-10 w-10"}`} />;
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};

// Use memo to prevent unnecessary re-renders
export default memo(CachedImage);
