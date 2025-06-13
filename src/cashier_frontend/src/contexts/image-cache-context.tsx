// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { createContext, useContext, useState, ReactNode } from "react";

interface ImageCacheContextType {
    getCachedImage: (url: string) => string | null;
    setCachedImage: (url: string, dataUrl: string) => void;
    preloadImage: (url: string) => Promise<void>;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

export function useImageCache() {
    const context = useContext(ImageCacheContext);
    if (!context) {
        throw new Error("useImageCache must be used within an ImageCacheProvider");
    }
    return context;
}

export function ImageCacheProvider({ children }: { children: ReactNode }) {
    const [imageCache, setImageCache] = useState<Record<string, string>>({});

    const getCachedImage = (url: string): string | null => {
        return imageCache[url] || null;
    };

    const setCachedImage = (url: string, dataUrl: string) => {
        setImageCache((prev) => ({ ...prev, [url]: dataUrl }));
    };

    // Preload image and store in cache
    const preloadImage = async (url: string): Promise<void> => {
        if (imageCache[url]) return;

        try {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    setCachedImage(url, url); // Store the URL directly
                    resolve();
                };
                img.onerror = () => {
                    reject(new Error(`Failed to load image: ${url}`));
                };
                img.src = url;
            });
        } catch (error) {
            console.error("Error preloading image:", error);
        }
    };

    return (
        <ImageCacheContext.Provider value={{ getCachedImage, setCachedImage, preloadImage }}>
            {children}
        </ImageCacheContext.Provider>
    );
}
