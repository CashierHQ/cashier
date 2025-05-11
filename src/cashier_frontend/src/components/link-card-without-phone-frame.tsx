import { cn } from "@/lib/utils";

export default function LinkCardWithoutPhoneFrame({
    displayComponent,
    title,
    message,
    label,
    onClaim,
    disabled,
    showHeader = false,
    headerText = "",
}: {
    displayComponent?: React.ReactNode;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
    disabled?: boolean;
    showHeader?: boolean;
    headerText?: string;
}) {
    return (
        <div className="w-full flex relative flex-col items-center bg-lightgreen rounded-xl py-5 px-8">
            {showHeader && (
                <div className="w-full absolute top-0 left-0 flex flex-col items-center bg-green rounded-t-xl">
                    <h3 className="text-[18px] text-white font-medium py-1">{headerText}</h3>
                </div>
            )}
            <div
                className={`w-full flex flex-col items-center bg-lightgreen rounded-xl p-3 ${showHeader ? "mt-5" : "mt-3"}`}
            >
                {displayComponent}
                <div className="mb-8 text-center">
                    <h3 className="text-[16px] font-medium mt-2">{title}</h3>
                    <h3 className="text-[14px] font-light text-[#475467]/80 mt-1">{message}</h3>
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
                            "text-white bg-green rounded-full py-2 px-8 mt-3 text-base w-[100%] text-center",
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
