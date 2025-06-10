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

import { Children, ReactElement, ReactNode, useEffect } from "react";
import { ChevronLeft, LoaderCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MultiStepFormContext,
    MultiStepFormProvider,
    useMultiStepFormContext,
} from "@/contexts/multistep-form-context";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { Button } from "./ui/button";
import { RiMenu2Line } from "react-icons/ri";
import { SheetTrigger } from "./ui/sheet";
import { useWalletContext } from "@/contexts/wallet-context";
import { useDeviceSize } from "@/hooks/responsive-hook";

interface MultiStepFormProps {
    initialStep: number;
    children: ReactNode;
}

export function MultiStepForm({ initialStep = 0, children }: MultiStepFormProps) {
    return (
        <MultiStepFormProvider initialStep={initialStep}>
            <div className="w-full flex-grow flex flex-col h-full">{children}</div>
        </MultiStepFormProvider>
    );
}

interface MultiStepFormHeaderProps {
    onClickBack?: (context: MultiStepFormContext) => void;
    showIndicator?: boolean;
    showHeader?: boolean;
    backButtonDisabled?: boolean;
}

export function MultiStepFormHeader({
    onClickBack = () => {},
    showIndicator = true,
    showHeader = true,
    backButtonDisabled = false,
}: MultiStepFormHeaderProps) {
    const context = useMultiStepFormContext();
    const { openWallet } = useWalletContext();
    const responsive = useDeviceSize();

    return (
        <div className="w-full flex-none">
            {showHeader && (
                <div className="w-full flex items-center justify-center mb-1.5 py-1 relative">
                    <h4 className="scroll-m-20 text-lg font-semibold tracking-tight self-center transition-opacity duration-200">
                        {context.stepName}
                    </h4>
                    <button
                        className="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
                        onClick={() => onClickBack(context)}
                        disabled={backButtonDisabled}
                    >
                        {backButtonDisabled ? (
                            <LoaderCircle
                                width={22}
                                height={22}
                                strokeWidth={2}
                                className="animate-spin"
                            />
                        ) : (
                            <ChevronLeft width={25} height={25} strokeWidth={2} />
                        )}
                    </button>

                    {responsive.isSmallDevice && (
                        <div className="flex items-center gap-3 absolute right-0">
                            <Button
                                variant="outline"
                                className="ml-auto light-borders p-0 w-9 h-9"
                                onClick={() => openWallet()}
                            >
                                <Wallet size={16} color={"#35A18A"} />
                            </Button>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="light-borders">
                                    <RiMenu2Line />
                                </Button>
                            </SheetTrigger>
                        </div>
                    )}
                </div>
            )}

            {showIndicator && (
                <div className="flex w-full mb-3">
                    {new Array(context.steps).fill(0).map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "h-[6px] rounded-full mx-[2px] transition-all duration-300",
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
        <div className="relative w-full flex-1 flex flex-col">
            <div
                key={step}
                className={cn(
                    "w-full h-full flex flex-col flex-grow transition-all duration-300 ease-in-out",
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

interface MultiStepFormFooterProps {
    showFixedButton?: boolean;
}

export function MultiStepFormFooter({ showFixedButton = true }: MultiStepFormFooterProps) {
    const { buttonState } = useLinkCreationFormStore();

    if (!showFixedButton) return null;

    return (
        <div className="flex-none w-full mb-5 w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10">
            <Button
                type="button"
                variant="default"
                className="w-full disabled:bg-disabledgreen"
                onClick={buttonState.action || undefined}
                disabled={buttonState.isDisabled}
            >
                {buttonState.label}
            </Button>
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
MultiStepForm.Footer = MultiStepFormFooter;
