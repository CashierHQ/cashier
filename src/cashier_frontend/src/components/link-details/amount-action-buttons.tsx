import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AmountActionButtonData {
    content?: ReactNode;
    action: () => void;
}

interface AmountActionButtons {
    data: AmountActionButtonData[];
    isDisabled?: boolean;
}

export function AmountActionButtons({ data, isDisabled }: AmountActionButtons) {
    return (
        <div className="flex justify-between w-full mx-auto">
            {data.map(({ content, action }, index) => (
                <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="asset-amount-percentage-button"
                    onClick={action}
                    disabled={isDisabled}
                >
                    {content}
                </Button>
            ))}
        </div>
    );
}
