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
        <div className="flex justify-between mx-auto pt-1">
            {data.map(({ content, action }, index) => (
                <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit font-light rounded-[8px] shadow-xs border border-input hover:text-destructive hover:border-destructive hover:bg-white"
                    onClick={action}
                >
                    {content}
                </Button>
            ))}
        </div>
    );
}
