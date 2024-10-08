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
        <div className="flex flex-col items-center bg-lightgreen rounded-md mt-5 py-5 px-8 h-[70vh]">
            <div className="text-lg font-medium">{header}</div>
            <div
                id="phone-frame"
                className="flex flex-col items-center bg-white rounded-[2rem] border-black border-8 mt-3 px-3 h-screen"
            >
                <div
                    id="phone-notch-section"
                    className="flex w-3/5 h-7 bg-black items-center border-black border-8 rounded-b-2xl"
                ></div>
                <div className="w-full flex justify-center items-center mt-3">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[80px]" />
                </div>
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
        </div>
    );
}
