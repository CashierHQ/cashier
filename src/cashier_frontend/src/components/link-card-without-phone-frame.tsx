import { cn } from "@/lib/utils";

export default function LinkCardWithoutPhoneFrame({
    src,
    title,
    message,
    label,
    onClaim,
}: {
    src: string;
    header?: string;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
}) {
    return (
        <div className="flex flex-col items-center bg-lightgreen rounded-md mt-5 py-5 px-8">
            <div className="flex flex-col items-center bg-lightgreen rounded-md mt-3 p-3">
                <img src={src} alt="Link template" />
                <h3 className="font-semibold py-2">{title}</h3>
                <h3 className="text-xs">{message}</h3>
                <div
                    className={cn(
                        "text-white bg-green rounded-full py-1 px-8 mt-3 text-base w-full text-center",
                        onClaim ? "cursor-pointer" : "",
                    )}
                    onClick={onClaim}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}
