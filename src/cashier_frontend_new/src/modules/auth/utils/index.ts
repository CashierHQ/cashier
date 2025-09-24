export const getScreenDimensions = () => {
  if (window.screen) {
    return {
      width: window.screen.width,
      height: window.screen.height,
    };
  }
  // Default dimensions for SSR
  return {
    width: 1920,
    height: 1080,
  };
};
