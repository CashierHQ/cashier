import { Children, cloneElement, ReactElement, ReactNode, useEffect, useState } from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { MultiStepFormProvider } from "@/contexts/multistep-form-context";

interface MultiStepFormProps {
    initialStep: number;
    children: ReactNode;
}

export default function MultiStepForm({ initialStep = 0, children }: MultiStepFormProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);

    const header = Children.toArray(children).find(
        (child) => (child as ReactElement).type === MultiStepForm.Header,
    ) as ReactElement<HeaderProps>;

    const items = Children.toArray(children).filter(
        (child) => (child as ReactElement).type === MultiStepForm.Item,
    ) as ReactElement<ItemProps>[];

    return (
        <div className="w-full flex flex-col flex-grow items-center">
            <MultiStepFormProvider>
                {header &&
                    cloneElement(header, {
                        steps: items.length,
                        currentStep: currentStep,
                        stepName: items[currentStep]?.props.name,
                        onClickBack: () => setCurrentStep((old) => (old <= 0 ? 0 : old - 1)),
                    })}
                {items[currentStep]}
            </MultiStepFormProvider>
        </div>
    );
}

interface HeaderProps {
    stepName?: string;
    steps?: number;
    currentStep?: number;
    onClickBack?: () => void;
}

const Header = ({
    steps = 1,
    currentStep = 0,
    stepName = "",
    onClickBack = () => {},
}: HeaderProps) => {
    return (
        <div className="w-full">
            <div className="w-full flex items-center justify-center mb-3 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {stepName}
                </h4>
                <button
                    className="absolute left-1 cursor-pointer text-[1.5rem]"
                    onClick={onClickBack}
                >
                    <ChevronLeftIcon width={25} height={25} />
                </button>
            </div>
            <div className="flex w-full mb-3">
                {[1, 2, 3].map((_, index) => (
                    <div
                        key={index}
                        className={cn("h-[4px] rounded-full mx-[2px]", {
                            "bg-green": index <= currentStep,
                            "bg-lightgreen": index > currentStep,
                        })}
                        style={{ width: `${100 / steps}%` }}
                    />
                ))}
            </div>
        </div>
    );
};

interface ItemProps {
    name: string;
    children: ReactNode;
}

const Item = ({ children }: ItemProps) => {
    useEffect(() => {});

    return children;
};

MultiStepForm.Header = Header;
MultiStepForm.Item = Item;
