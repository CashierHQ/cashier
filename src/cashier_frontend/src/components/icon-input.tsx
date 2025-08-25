// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { SyntheticEvent, useState, useEffect, useRef } from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IconInputProps extends InputProps {
  icon?: React.ReactNode;
  isCurrencyInput: boolean;
  currencySymbol?: string;
  isDisabled?: boolean;
  rightIcon?: React.ReactNode;
  onRightIconClick?: (e: SyntheticEvent) => void;
  onFocusShowIcon?: boolean;
  onFocusText?: boolean;
  value?: string | number;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  (
    {
      className,
      icon,
      rightIcon,
      onRightIconClick,
      isCurrencyInput,
      currencySymbol,
      onFocusText,
      value,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (onFocusText && value) {
        setIsFocused(true);
      }
    }, [value, onFocusText]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          inputRef.current &&
          !inputRef.current.contains(event.target as Node) &&
          !value
        ) {
          setIsFocused(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [value]);

    if (isCurrencyInput) {
      return (
        <div className="relative">
          <Input className={className} ref={ref} value={value} {...props} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {currencySymbol}
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative w-full" ref={inputRef}>
          <Input
            style={{
              paddingLeft: icon ? "2.5rem" : "0.75rem",
              paddingRight: rightIcon ? "3rem" : "0.75rem",
            }}
            className={cn(className)}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              console.log("onBlur");
              setTimeout(() => setIsFocused(false), 0);
            }}
            value={value}
            {...props}
          />
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          {rightIcon && (!props.onFocusShowIcon || isFocused) && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
      );
    }
  },
);

IconInput.displayName = "IconInput";

export { IconInput };
