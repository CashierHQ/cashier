import { Children, ReactElement, ReactNode, useEffect } from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import {
    MultiStepFormContext,
    MultiStepFormProvider,
    useMultiStepFormContext,
} from "@/contexts/multistep-form-context";

interface MultiStepFormProps {
    initialStep: number;
    children: ReactNode;
}

export function MultiStepForm({ initialStep = 0, children }: MultiStepFormProps) {
    return (
        <MultiStepFormProvider initialStep={initialStep}>
            <div className="w-full flex flex-col h-full">{children}</div>
        </MultiStepFormProvider>
    );
}

interface MultiStepFormHeaderProps {
    onClickBack?: (context: MultiStepFormContext) => void;
    showIndicator?: boolean;
    showHeader?: boolean;
}

export function MultiStepFormHeader({
    onClickBack = () => {},
    showIndicator = true,
    showHeader = true,
}: MultiStepFormHeaderProps) {
    const context = useMultiStepFormContext();

    return (
        <div className="w-full flex-none">
            {showHeader && (
                <div className="w-full flex items-center justify-center mb-3 relative">
                    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center transition-opacity duration-200">
                        {context.stepName}
                    </h4>
                    <button
                        className="absolute left-1 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
                        onClick={() => onClickBack(context)}
                    >
                        <ChevronLeftIcon width={25} height={25} />
                    </button>
                </div>
            )}

            {showIndicator && (
                <div className="flex w-full mb-3">
                    {new Array(context.steps).fill(0).map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "h-[4px] rounded-full mx-[2px] transition-all duration-300",
                                {
                                    "bg-green": index <= context.step,
                                    "bg-lightgreen": index > context.step,
                                },
                            )}
                            style={{ width: `${100 / context.steps}%` }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface MultiStepFormItemsProps {
    children?: ReactNode;
}

export function MultiStepFormItems({ children }: MultiStepFormItemsProps) {
    const { step, setSteps, setStepName, direction } = useMultiStepFormContext();

    const stepsList = Children.toArray(children) as ReactElement<MultiStepFormItemProps>[];
    const stepComponent = stepsList[step];

    useEffect(() => {
        setSteps(stepsList.length);
        setStepName(stepComponent.props.name);
    }, [step, children]);

    return (
        <div className="relative w-full flex-1 flex flex-col overflow-hidden">
            <div
                key={step}
                className={cn(
                    "w-full h-full flex flex-col transition-all duration-300 ease-in-out",
                    direction === "forward" && [
                        "animate-in slide-in-from-right",
                        "data-[state=entering]:translate-x-full",
                        "data-[state=entered]:translate-x-0",
                    ],
                    direction === "backward" && [
                        "animate-in slide-in-from-left",
                        "data-[state=entering]:translate-x-[-100%]",
                        "data-[state=entered]:translate-x-0",
                    ],
                )}
            >
                {stepComponent}
            </div>
        </div>
    );
}

interface MultiStepFormItemProps {
    name: string;
    children: ReactNode;
}

export function MultiStepFormItem({ children }: MultiStepFormItemProps) {
    return <div className="flex flex-col flex-1">{children}</div>;
}

MultiStepForm.Header = MultiStepFormHeader;
MultiStepForm.Items = MultiStepFormItems;
MultiStepForm.Item = MultiStepFormItem;
