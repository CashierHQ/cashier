/**
 * Gets the screen dimensions of the user's device.
 * Returns actual screen dimensions in browser environment.
 * If window.screen is not available, returns default dimensions of 1920x1080.
 *
 * @returns {Object} Screen dimensions with width and height properties
 * @returns {number} return.width - Screen width in pixels
 * @returns {number} return.height - Screen height in pixels
 */
export const getScreenDimensions = () => {
  if (window.screen) {
    return {
      width: window.screen.width,
      height: window.screen.height,
    };
  }

  // Default dimensions
  return {
    width: 1920,
    height: 1080,
  };
};
