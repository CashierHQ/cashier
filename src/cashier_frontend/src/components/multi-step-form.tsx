import { Children, ReactElement, ReactNode, useState } from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { IntentCreateModel } from "@/services/types/intent.service.types";
import { LINK_TYPE } from "@/services/types/enum";

/**
 * - V1: type for handle submit
 * - V2: type for handle change
 */
export interface ParitalFormProps<V1, V2> {
    handleSubmit: (values: V1) => void;
    handleChange: (value: V2) => void;
    isDisabled: boolean;
    defaultValues: Partial<V2>;
    linkType: LINK_TYPE;
}

/**
 * - V1: type for handle submit
 * - V2: type for handle change
 */
interface MultiStepFormProps<V1 extends object, V2 extends object> {
    initialStep: number;
    formData: V2;
    children: ReactNode;
    handleSubmit: (values: V1) => void;
    handleBackStep: () => Promise<void>;
    handleBack?: () => void;
    handleChange: (value: V2) => void;
    isDisabled: boolean;
    actionCreate: IntentCreateModel | undefined;
}

/**
 * - V1: type for handle submit
 * - V2: type for handle change
 */
interface ItemProp<V1, V2> {
    handleSubmit: (values: V1) => Promise<void>;
    isDisabled: boolean;
    name: string;
    linkType: LINK_TYPE;
    render: (props: ParitalFormProps<V1, V2>) => ReactElement<ParitalFormProps<V1, V2>>;
}

/**
 * - V1: type for handle submit
 * - V2: type for handle change
 */
export default function MultiStepForm<V1 extends object, V2 extends object>({
    initialStep = 0,
    formData,
    handleBackStep,
    children,
    handleBack,
    handleChange,
    isDisabled,
    actionCreate,
}: MultiStepFormProps<V1, V2>) {
    const partialForms = Children.toArray(children) as ReactElement<ItemProp<V1, V2>>[];
    const [currentStep, setCurrentStep] = useState(initialStep);

    const handleClickBack = async () => {
        if ((!currentStep || actionCreate) && handleBack) {
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
                <div
                    className="absolute left-1 cursor-pointer text-[1.5rem]"
                    onClick={handleClickBack}
                >
                    <ChevronLeftIcon width={25} height={25} />
                </div>
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
                        handleSubmit: async (values: V1) => {
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
                        linkType: partialForm.props.linkType,
                    });
                }
                return null;
            })}
        </div>
    );
}

const Item = <V1, V2>({ handleSubmit, render, isDisabled, linkType }: ItemProp<V1, V2>) => {
    return (
        <>
            {render({
                defaultValues: {} as V2,
                handleChange: () => {},
                handleSubmit: handleSubmit,
                isDisabled: isDisabled,
                linkType: linkType,
            })}
        </>
    );
};

MultiStepForm.Item = Item;
