import { Children, FunctionComponent, ReactElement, useState } from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { ActionCreateModel } from "@/services/types/action.service.types";
export interface ParitalFormProps<T> {
    handleSubmit: (values: T) => void;
    handleChange: (e: any) => void;
    isDisabled: boolean;
    defaultValues: Partial<T>;
}

interface MultiStepFormProps<T extends Object> {
    initialStep: number;
    formData: T;
    children: ReactElement<ItemProp> | ReactElement<ItemProp>[];
    handleSubmit: (values: T) => void;
    handleBackStep: () => Promise<void>;
    handleBack?: () => void;
    handleChange: (e: any) => void;
    isDisabled: boolean;
    actionCreate: ActionCreateModel | undefined;
}

interface ItemProp {
    handleSubmit: (values: any) => Promise<void>;
    isDisabled: boolean;
    name: string;
    render: (props: ParitalFormProps<any>) => ReactElement<ParitalFormProps<any>>;
}

export default function MultiStepForm<T extends Object>({
    initialStep = 0,
    formData,
    handleSubmit: handleFinish,
    handleBackStep,
    children,
    handleBack,
    handleChange,
    isDisabled,
    actionCreate,
}: MultiStepFormProps<T>) {
    const partialForms = Children.toArray(children) as ReactElement<ItemProp>[];
    const [currentStep, setCurrentStep] = useState(initialStep);

    const handleClickBack = async () => {
        if (!currentStep && handleBack) {
            handleBack();
        } else {
            await handleBackStep();
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-center mb-3 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {partialForms[currentStep].props.name}
                </h4>
                {!actionCreate && (currentStep || (!currentStep && handleBack)) ? (
                    <div
                        className="absolute left-1 cursor-pointer text-[1.5rem]"
                        onClick={handleClickBack}
                    >
                        <ChevronLeftIcon width={25} height={25} />
                    </div>
                ) : (
                    <div></div>
                )}
            </div>
            <div className="flex w-full mb-3">
                {partialForms.map((_, index) => (
                    <div
                        key={index}
                        className={`h-[4px] rounded-full mx-[2px] ${index <= currentStep ? "bg-green" : "bg-lightgreen"}`}
                        style={{ width: `${100 / partialForms.length}%` }}
                    ></div>
                ))}
            </div>
            {Children.map(partialForms, (partialForm, index) => {
                if (currentStep == index) {
                    return partialForm.props.render({
                        defaultValues: formData,
                        handleChange: handleChange,
                        handleSubmit: async (values: any) => {
                            try {
                                await partialForm.props.handleSubmit(values);
                                if (index != partialForms.length - 1) {
                                    setCurrentStep(index + 1);
                                }
                            } catch (err) {
                                console.log(err);
                            }
                        },
                        isDisabled: isDisabled,
                    });
                }
                return null;
            })}
        </div>
    );
}

const Item: FunctionComponent<ItemProp> = ({ handleSubmit, render, isDisabled }) => {
    return (
        <>
            {render({
                defaultValues: {},
                handleChange: () => {},
                handleSubmit: handleSubmit,
                isDisabled: isDisabled,
            })}
        </>
    );
};

MultiStepForm.Item = Item;
