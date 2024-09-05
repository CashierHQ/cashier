import { Button } from "@/components/ui/button";
import { Children, FunctionComponent, ReactElement, useState } from "react";

export interface ParitalFormProps<T> {
    handleSubmit: (values: T) => any,
    handleChange: (e: any) => any,
    defaultValues: Partial<T>
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


export default function MultiStepForm<T extends Object>({ initialStep = 0, formData, handleSubmit: handleFinish, children, handleBack, handleChange }: MultiStepFormProps<T>) {
    const partialForms = Children.toArray(children) as ReactElement<ItemProp>[];
    const [currentStep, setCurrentStep] = useState(initialStep);

    return (
        <div className="w-full flex flex-col items-center py-5">
            <div className="w-full flex justify-between mb-5">
                {
                    (currentStep || (!currentStep && handleBack)) ? <Button variant="outline" size="icon" onClick={() => {
                        if (!currentStep && handleBack) handleBack();
                        else setCurrentStep(currentStep - 1);
                    }}>
                        ←
                    </Button> : <div></div>
                }
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                    {partialForms[currentStep].props.name}
                </h4>
                <span className="scroll-m-20 tracking-tight">
                    {currentStep + 1}/{partialForms.length}
                </span>
            </div>
            {
                Children.map(partialForms, (partialForm, index) => {
                    if ((currentStep == index)) {
                        return partialForm.props.render({
                            defaultValues: formData,
                            handleChange: handleChange,
                            handleSubmit: (values: any) => {
                                partialForm.props.handleSubmit(values);
                                if (index == partialForms.length - 1) handleFinish({ ...formData, ...values });
                                else setCurrentStep(index + 1);
                            }
                        })
                    }
                    return null;
                })
            }
        </div>
    );
}

const Item: FunctionComponent<ItemProp> = ({ handleSubmit, render }) => {
    return <>
        {
            render({
                defaultValues: {},
                handleChange: () => { },
                handleSubmit: handleSubmit
            })
        }
    </>
}

MultiStepForm.Item = Item;