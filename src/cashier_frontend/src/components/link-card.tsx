import { cn } from "@/lib/utils";

export default function LinkCard({
    src,
    header,
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
        <div className="flex flex-col items-center bg-lightgreen rounded-md mt-5 p-5 h-[70vh]">
            <div className="text-lg font-medium">{header}</div>
            <div className="flex flex-col items-center bg-white rounded-[2rem] border-black border-8 mt-3 p-5 h-screen">
                <div className="flex flex-col items-center bg-lightgreen rounded-md mt-5 p-3">
                    <img src={src} alt="Link template" />
                    <h3 className="font-semibold py-2">{title}</h3>
                    <h3 className="text-sm">{message}</h3>
                    <div
                        className={cn(
                            "text-white bg-green rounded-full py-2 px-8 mt-3 text-base w-full text-center",
                            onClaim ? "cursor-pointer" : "",
                        )}
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}
