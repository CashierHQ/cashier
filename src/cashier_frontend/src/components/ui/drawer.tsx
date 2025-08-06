// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import * as React from "react";
import { Drawer as VaulDrawer } from "vaul";
import { cn } from "@/lib/utils";

const Drawer = ({
    closeThreshold = 0.5,
    snapPoints = [1],
    snapToSequentialPoint = false,
    ...props
}: React.ComponentProps<typeof VaulDrawer.Root>) => (
    <VaulDrawer.Root
        closeThreshold={closeThreshold}
        snapPoints={snapPoints}
        snapToSequentialPoint={snapToSequentialPoint}
        {...props}
    />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = VaulDrawer.Trigger;

const DrawerPortal = VaulDrawer.Portal;

const DrawerClose = VaulDrawer.Close;

const DrawerOverlay = React.forwardRef<
    React.ElementRef<typeof VaulDrawer.Overlay>,
    React.ComponentPropsWithoutRef<typeof VaulDrawer.Overlay>
>(({ className, ...props }, ref) => (
    <VaulDrawer.Overlay
        ref={ref}
        className={cn("fixed inset-0 z-[50] bg-black/80", className)}
        {...props}
    />
));
DrawerOverlay.displayName = VaulDrawer.Overlay.displayName;

const DrawerContent = React.forwardRef<
    React.ElementRef<typeof VaulDrawer.Content>,
    React.ComponentPropsWithoutRef<typeof VaulDrawer.Content>
>(({ className, children, ...props }, ref) => (
    <DrawerPortal>
        <DrawerOverlay />
        <VaulDrawer.Content
            ref={ref}
            className={cn(
                "fixed inset-x-0 bottom-0 z-[50] mt-24 flex h-auto flex-col rounded-t-[24px] border bg-background",
                className,
            )}
            {...props}
        >
            {/* <DrawerHandle /> */}
            {children}
        </VaulDrawer.Content>
    </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHandle = React.forwardRef<
    React.ElementRef<typeof VaulDrawer.Handle>,
    React.ComponentPropsWithoutRef<typeof VaulDrawer.Handle>
>(({ className, ...props }, ref) => (
    <VaulDrawer.Handle
        ref={ref}
        className={cn("mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted", className)}
        {...props}
    />
));
DrawerHandle.displayName = "DrawerHandle";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
    React.ElementRef<typeof VaulDrawer.Title>,
    React.ComponentPropsWithoutRef<typeof VaulDrawer.Title>
>(({ className, ...props }, ref) => (
    <VaulDrawer.Title
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
    />
));
DrawerTitle.displayName = VaulDrawer.Title.displayName;

const DrawerDescription = React.forwardRef<
    React.ElementRef<typeof VaulDrawer.Description>,
    React.ComponentPropsWithoutRef<typeof VaulDrawer.Description>
>(({ className, ...props }, ref) => (
    <VaulDrawer.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
DrawerDescription.displayName = VaulDrawer.Description.displayName;

export {
    Drawer,
    
    
    
    
    DrawerContent,
    DrawerHeader,
    
    DrawerTitle,
    
    
};
