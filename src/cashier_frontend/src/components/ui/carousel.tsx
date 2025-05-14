import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
    opts?: CarouselOptions;
    plugins?: CarouselPlugin;
    orientation?: "horizontal" | "vertical";
    setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
    carouselRef: ReturnType<typeof useEmblaCarousel>[0];
    api: ReturnType<typeof useEmblaCarousel>[1];
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
    scrollTo: (index: number) => void;
    selectedIndex: number;
    scrollSnaps: number[];
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
    const context = React.useContext(CarouselContext);

    if (!context) {
        throw new Error("useCarousel must be used within a <Carousel />");
    }

    return context;
}

const Carousel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }, ref) => {
    const [carouselRef, api] = useEmblaCarousel(
        {
            ...opts,
            axis: orientation === "horizontal" ? "x" : "y",
        },
        plugins,
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

    const onSelect = React.useCallback((api: CarouselApi) => {
        if (!api) return;

        setSelectedIndex(api.selectedScrollSnap());
        setScrollSnaps(api.scrollSnapList());
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);

    const scrollTo = React.useCallback(
        (index: number) => {
            api?.scrollTo(index);
        },
        [api],
    );

    const scrollPrev = React.useCallback(() => {
        api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
        api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                scrollPrev();
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                scrollNext();
            }
        },
        [scrollPrev, scrollNext],
    );

    React.useEffect(() => {
        if (!api || !setApi) {
            return;
        }

        setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
        if (!api) {
            return;
        }

        onSelect(api);
        api.on("reInit", onSelect);
        api.on("select", onSelect);

        return () => {
            api?.off("select", onSelect);
        };
    }, [api, onSelect]);

    return (
        <CarouselContext.Provider
            value={{
                carouselRef,
                api: api,
                opts,
                orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
                scrollPrev,
                scrollNext,
                canScrollPrev,
                canScrollNext,
                scrollTo,
                selectedIndex,
                scrollSnaps,
            }}
        >
            <div
                ref={ref}
                onKeyDownCapture={handleKeyDown}
                className={cn("relative -z-100", className)}
                role="region"
                aria-roledescription="carousel"
                {...props}
            >
                <CarouselNext />
                <CarouselPrevious />
                {children}
                <CarouselDots />
            </div>
        </CarouselContext.Provider>
    );
});
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        const { carouselRef, orientation } = useCarousel();

        return (
            <div ref={carouselRef} className="overflow-hidden w-[100vw] md:w-[100%]">
                <div
                    ref={ref}
                    className={cn(
                        "flex",
                        orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
                        className,
                    )}
                    {...props}
                />
            </div>
        );
    },
);
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        const { orientation } = useCarousel();

        return (
            <div
                ref={ref}
                role="group"
                aria-roledescription="slide"
                className={cn(
                    "min-w-0 shrink-0 grow-0 basis-full",
                    orientation === "horizontal" ? "pl-4" : "pt-4",
                    className,
                )}
                {...props}
            />
        );
    },
);
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
    ({ className, variant = "outline", size = "icon", ...props }, ref) => {
        const { orientation, scrollPrev, canScrollPrev } = useCarousel();

        return (
            <Button
                ref={ref}
                variant={variant}
                size={size}
                className={cn(
                    "absolute h-10 w-10 rounded-full border-none",
                    orientation === "horizontal"
                        ? "left-6 md:left-12 2xl:left-6 top-1/2 -translate-y-1/2 z-10"
                        : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
                    className,
                )}
                disabled={!canScrollPrev}
                onClick={scrollPrev}
                type="button"
                {...props}
            >
                <FaChevronLeft className="h-5 w-5" color="#36A18B" />
                <span className="sr-only">Previous slide</span>
            </Button>
        );
    },
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
    ({ className, variant = "outline", size = "icon", ...props }, ref) => {
        const { orientation, scrollNext, canScrollNext } = useCarousel();

        return (
            <Button
                ref={ref}
                variant={variant}
                size={size}
                className={cn(
                    "absolute h-10 w-10 rounded-full border-none",
                    orientation === "horizontal"
                        ? "right-6 md:right-12 2xl:right-6 top-1/2 -translate-y-1/2 z-10"
                        : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
                    className,
                )}
                disabled={!canScrollNext}
                onClick={scrollNext}
                type="button"
                {...props}
            >
                <FaChevronRight className="h-5 w-5" color="#36A18B" />
                <span className="sr-only">Next slide</span>
            </Button>
        );
    },
);
CarouselNext.displayName = "CarouselNext";

const DotButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive: boolean }
>(({ isActive, className, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "h-2 w-2 rounded-full mx-1",
                isActive ? "bg-green" : "bg-white",
                className,
            )}
            {...props}
        />
    );
});
DotButton.displayName = "DotButton";

const CarouselDots = () => {
    const { scrollTo, selectedIndex, scrollSnaps } = useCarousel();

    return (
        <div className="flex justify-center items-center">
            <div className="flex justify-center items-center mt-4 bg-white/50 p-2 rounded-full w-fit gap-2">
                {scrollSnaps.map((_, index) => (
                    <DotButton
                        key={index}
                        isActive={index === selectedIndex}
                        onClick={() => scrollTo(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export {
    type CarouselApi,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
};
