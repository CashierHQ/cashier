import { clamp } from "@/utils/helpers/clamp";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

export interface MultiStepFormContext {
    step: number;
    steps: number;
    nextStep: () => void;
    prevStep: () => void;

    name(step: number): string;
    register(name: string): number;
}

const MultiStepFormContext = createContext<MultiStepFormContext | null>(null);

export interface MultiStepFormContextProviderProps {
    steps?: number;
    initialStep?: number;
    children?: ReactNode;
}

export function MultiStepFormProvider({
    steps = 0,
    initialStep = 0,
    children,
}: MultiStepFormContextProviderProps) {
    const [step, setStep] = useState(initialStep);

    const nextStep = useCallback(() => setStep((old) => clamp(old + 1, 0, steps - 1)), [step]);
    const prevStep = useCallback(() => setStep((old) => clamp(old - 1, 0, steps - 1)), [step]);

    return (
        <MultiStepFormContext.Provider
            value={{
                step,
                steps,
                nextStep,
                prevStep,
            }}
        >
            {children}
        </MultiStepFormContext.Provider>
    );
}

export function useMultiStepFormContext() {
    const context = useContext(MultiStepFormContext);

    if (!context) {
        throw new Error("useMultiStepFormContext called outside of MultiStepFormContextProvider");
    }

    return context;
}
