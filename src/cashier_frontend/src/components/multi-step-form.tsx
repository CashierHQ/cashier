import { Button } from "@/components/ui/button";
import { Children, FunctionComponent, ReactElement, useState } from "react";

export interface ParitalFormProps<T> {
    handleSubmit: (values: T) => any;
    handleChange: (e: any) => any;
    defaultValues: Partial<T>;
}

interface MultiStepFormProps<T extends Object> {
    initialStep: number;
    formData: T;
    children: ReactElement<ItemProp> | ReactElement<ItemProp>[];
    handleSubmit: (values: T) => any;
    handleBack?: () => any;
    handleChange: (e: any) => any;
}

interface ItemProp {
    handleSubmit: (values: any) => any;
    name: string;
    render: (props: ParitalFormProps<any>) => ReactElement<ParitalFormProps<any>>;
}

export default function MultiStepForm<T extends Object>({
    initialStep = 0,
    formData,
    handleSubmit: handleFinish,
    children,
    handleBack,
    handleChange,
}: MultiStepFormProps<T>) {
    const partialForms = Children.toArray(children) as ReactElement<ItemProp>[];
    const [currentStep, setCurrentStep] = useState(initialStep);

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full flex justify-center mb-5 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {partialForms[currentStep].props.name}
                </h4>
                {currentStep || (!currentStep && handleBack) ? (
                    <div
                        className="absolute left-1 cursor-pointer"
                        onClick={() => {
                            if (!currentStep && handleBack) handleBack();
                            else setCurrentStep(currentStep - 1);
                        }}
                    >
                        ←
                    </div>
                ) : (
                    <div></div>
                )}
            </div>
            <div className="flex w-full mb-5">
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
                        handleSubmit: (values: any) => {
                            partialForm.props.handleSubmit(values);
                            if (index == partialForms.length - 1)
                                handleFinish({ ...formData, ...values });
                            else setCurrentStep(index + 1);
                        },
                    });
                }
                return null;
            })}
        </div>
    );
}

const Item: FunctionComponent<ItemProp> = ({ handleSubmit, render }) => {
    return (
        <>
            {render({
                defaultValues: {},
                handleChange: () => {},
                handleSubmit: handleSubmit,
            })}
        </>
    );
};

MultiStepForm.Item = Item;
