import { cn } from "@/lib/utils";
import { useState } from "react";

export default function LinkCardWithoutPhoneFrame({
    src,
    title,
    message,
    label,
    onClaim,
    disabled,
    logoFallback,
}: {
    src: string;
    header?: string;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
    disabled?: boolean;
    logoFallback?: string;
}) {
    // Initial src with fallback
    const [imgSrc, setImgSrc] = useState(src || "/defaultLinkImage.png");

    // Handle image load error
    const handleImageError = () => {
        // If the current src is already the default, try another fallback
        if (imgSrc === "/defaultLinkImage.png") {
            setImgSrc("/token-basket-default.png");
        } else if (logoFallback) {
            setImgSrc(logoFallback);
        } else {
            setImgSrc("/defaultLinkImage.png");
        }
    };

    return (
        <div className="w-full flex flex-col items-center bg-lightgreen rounded-xl mt-5 py-5 px-8">
            <div className="w-full flex flex-col items-center bg-lightgreen rounded-xl mt-3 p-3">
                <img
                    src={imgSrc}
                    alt="Link template"
                    className="w-[200px]"
                    onError={handleImageError}
                />
                <div className="mb-8 text-center">
                    <h3 className="text-lg font-semibold py-2">{title}</h3>
                    <h3 className="text-md text-[#475467]">{message}</h3>
                </div>

                {disabled ? (
                    <div
                        className={cn(
                            "text-green bg-white rounded-full py-3 px-8 mt-3 text-base w-[100%] text-center font-bold",
                            onClaim ? "cursor-pointer" : "",
                        )}
                    >
                        {label}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "text-white bg-green rounded-full py-3 px-8 mt-3 text-base w-[100%] text-center",
                            onClaim ? "cursor-pointer" : "",
                        )}
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
}
