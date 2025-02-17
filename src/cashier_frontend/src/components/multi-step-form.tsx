import { Children, ReactElement, ReactNode, useEffect } from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { MultiStepFormProvider, useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useNavigate } from "react-router-dom";

interface MultiStepFormProps {
    initialStep: number;
    children: ReactNode;
}

export function MultiStepForm({ initialStep = 0, children }: MultiStepFormProps) {
    return (
        <MultiStepFormProvider initialStep={initialStep}>
            <div className="w-full flex flex-col flex-grow items-center">{children}</div>
        </MultiStepFormProvider>
    );
}

interface MultiStepFormHeaderProps {
    onClickBack?: () => void;
}

export function MultiStepFormHeader({ onClickBack = () => {} }: MultiStepFormHeaderProps) {
    const navigate = useNavigate();
    const { step: currentStep, steps, stepName, prevStep } = useMultiStepFormContext();

    const handleClickBack = () => {
        if (currentStep !== 0) {
            onClickBack();
            prevStep();
        } else {
            navigate("/");
        }
    };

    return (
        <div className="w-full">
            <div className="w-full flex items-center justify-center mb-3 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {stepName}
                </h4>
                <button
                    className="absolute left-1 cursor-pointer text-[1.5rem]"
                    onClick={handleClickBack}
                >
                    <ChevronLeftIcon width={25} height={25} />
                </button>
            </div>

            <div className="flex w-full mb-3">
                {new Array(steps).fill(0).map((_, index) => (
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
}

interface MultiStepFormItemsProps {
    children?: ReactNode;
}

export function MultiStepFormItems({ children }: MultiStepFormItemsProps) {
    const { step, setSteps, setStepName } = useMultiStepFormContext();

    const stepsList = Children.toArray(children) as ReactElement<MultiStepFormItemProps>[];
    const stepComponent = stepsList[step];

    useEffect(() => {
        setSteps(stepsList.length);
        setStepName(stepComponent.props.name);
    }, [step, children]);

    return stepComponent;
}

interface MultiStepFormItemProps {
    name: string;
    children: ReactNode;
}

export function MultiStepFormItem({ children }: MultiStepFormItemProps) {
    return children;
}

MultiStepForm.Header = MultiStepFormHeader;
MultiStepForm.Items = MultiStepFormItems;
MultiStepForm.Item = MultiStepFormItem;
