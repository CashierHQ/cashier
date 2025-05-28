// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { clamp } from "@/utils/helpers/number/clamp";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

export type TransitionDirection = "forward" | "backward";

export interface MultiStepFormContext {
    step: number;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    steps: number;
    setSteps: (steps: number) => void;
    stepName: string;
    setStepName: (name: string) => void;
    direction: TransitionDirection;
}

const MultiStepFormContext = createContext<MultiStepFormContext | null>(null);

export interface MultiStepFormContextProviderProps {
    initialStep?: number;
    children?: ReactNode;
}

export function MultiStepFormProvider({
    initialStep = 0,
    children,
}: MultiStepFormContextProviderProps) {
    const [step, setStep] = useState(initialStep);
    const [steps, setSteps] = useState(0);
    const [stepName, setStepName] = useState("");
    const [direction, setDirection] = useState<TransitionDirection>("forward");

    const nextStep = useCallback(() => {
        setDirection("forward");
        setStep((old) => clamp(old + 1, 0, steps - 1));
    }, [steps]);

    const prevStep = useCallback(() => {
        setDirection("backward");
        setStep((old) => clamp(old - 1, 0, steps - 1));
    }, [steps]);

    return (
        <MultiStepFormContext.Provider
            value={{
                step,
                setStep,
                nextStep,
                prevStep,
                steps,
                setSteps,
                stepName,
                setStepName,
                direction,
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
