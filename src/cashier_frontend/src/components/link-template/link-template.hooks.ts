// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useState } from "react";
import { CarouselApi } from "../ui/carousel";

export function useCarousel() {
  const [current, setCurrent] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (api) {
      setCurrent(api.selectedScrollSnap());
      api.on("select", () => setCurrent(api.selectedScrollSnap()));
    }
  }, [api]);

  return {
    current,
    setCurrent,
    api,
    setApi,
  };
}
