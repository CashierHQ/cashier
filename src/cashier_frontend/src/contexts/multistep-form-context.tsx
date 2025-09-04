// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { clamp } from "@/utils/helpers/number/clamp";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

type TransitionDirection = "forward" | "backward";

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

interface MultiStepFormContextProviderProps {
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
    throw new Error(
      "useMultiStepFormContext called outside of MultiStepFormContextProvider",
    );
  }

  return context;
}
