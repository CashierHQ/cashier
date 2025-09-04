// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { driver } from "driver.js";

// Add custom CSS for driver.js popover styling
export const customDriverStyles = `
.custom-driver-popover-class {
    border-radius: 16px !important;
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1) !important;
    background-color: white !important;
    padding: 20px !important;
    text-align: center !important;
    max-width: 320px !important;
}

.custom-driver-popover-class .driver-popover-title {
    font-size: 18px !important;
    font-weight: 600 !important;
    margin-bottom: 8px !important;
}

.custom-driver-popover-class .driver-popover-description {
    font-size: 14px !important;
    color: #6b7280 !important;
    font-weight: 300 !important;
}

.custom-driver-popover-class .driver-popover-arrow {
    border-color: white transparent transparent transparent !important;
}

.custom-driver-popover-class .icon-container {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
}

.custom-driver-popover-class .icon-wrapper {
    background-color: #e6f7f5;
    border-radius: 50%;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}
`;

export const initializeDriver = () => {
  const driverObj = driver({
    popoverClass: "custom-driver-popover-class",
    animate: false,
    allowClose: true,
    onPopoverRender: (popover) => {
      // Add party popper icon to the popover
      const iconContainer = document.createElement("div");
      iconContainer.className = "icon-container";

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "icon-wrapper";

      const svgIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      svgIcon.setAttribute("width", "28");
      svgIcon.setAttribute("height", "28");
      svgIcon.setAttribute("viewBox", "0 0 24 24");
      svgIcon.setAttribute("fill", "none");
      svgIcon.setAttribute("stroke", "#14b8a6");
      svgIcon.setAttribute("stroke-width", "2");
      svgIcon.setAttribute("stroke-linecap", "round");
      svgIcon.setAttribute("stroke-linejoin", "round");

      const path1 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path1.setAttribute("d", "M5.8 11.3 2 22l10.7-3.79");
      svgIcon.appendChild(path1);

      const path2 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path2.setAttribute("d", "M4 3h.01");
      svgIcon.appendChild(path2);

      const path3 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path3.setAttribute("d", "M22 8h.01");
      svgIcon.appendChild(path3);

      const path4 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path4.setAttribute("d", "M15 2h.01");
      svgIcon.appendChild(path4);

      const path5 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path5.setAttribute("d", "M22 20h.01");
      svgIcon.appendChild(path5);

      const path6 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path6.setAttribute(
        "d",
        "m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10",
      );
      svgIcon.appendChild(path6);

      const path7 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path7.setAttribute(
        "d",
        "m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17",
      );
      svgIcon.appendChild(path7);

      const path8 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path8.setAttribute(
        "d",
        "m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7",
      );
      svgIcon.appendChild(path8);

      const path9 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path9.setAttribute(
        "d",
        "M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z",
      );
      svgIcon.appendChild(path9);

      iconWrapper.appendChild(svgIcon);
      iconContainer.appendChild(iconWrapper);

      // Insert the icon at the beginning of the popover
      popover.wrapper.insertBefore(iconContainer, popover.wrapper.firstChild);

      // Position the popover above the button
      setTimeout(() => {
        const button = document.getElementById("copy-link-button");
        if (button) {
          const buttonRect = button.getBoundingClientRect();
          const popoverRect = popover.wrapper.getBoundingClientRect();

          popover.wrapper.style.left = `${buttonRect.left + buttonRect.width / 2 - popoverRect.width / 2}px`;
          popover.wrapper.style.top = `${buttonRect.top - popoverRect.height - 20}px`;
        }
      }, 0);
    },
  });

  return driverObj;
};
