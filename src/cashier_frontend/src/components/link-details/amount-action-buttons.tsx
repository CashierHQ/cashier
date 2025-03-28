import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AmountActionButtonData {
    content?: ReactNode;
    action: () => void;
}

interface AmountActionButtons {
    data: AmountActionButtonData[];
}

export function AmountActionButtons({ data }: AmountActionButtons) {
    return (
        <div className="flex justify-between mx-auto">
            {data.map(({ content, action }, index) => (
                <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-[75px] rounded-[8px]"
                    onClick={action}
                >
                    {content}
                </Button>
            ))}
        </div>
    );
}
