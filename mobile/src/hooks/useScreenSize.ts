import { useWindowDimensions } from 'react-native';

export type ScreenSize = 'phone' | 'tablet7' | 'tablet10';

export const useScreenSize = () => {
  const { width, height } = useWindowDimensions();

  const isTablet7  = width >= 600 && width < 840;
  const isTablet10 = width >= 840;
  const isTablet   = isTablet7 || isTablet10;
  const isPhone    = width < 600;

  const screenSize: ScreenSize = isTablet10 ? 'tablet10' : isTablet7 ? 'tablet7' : 'phone';

  return {
    width,
    height,
    isPhone,
    isTablet7,
    isTablet10,
    isTablet,
    screenSize,

    // Grid columns: phone=2, 7"=3, 10"=4
    columns: isTablet10 ? 4 : isTablet7 ? 3 : 2,

    // Horizontal padding
    paddingH: isTablet10 ? 40 : isTablet7 ? 28 : 16,

    // Mascot sizes
    mascotSm:  isTablet10 ? 100 : isTablet7 ? 84 : 68,
    mascotMd:  isTablet10 ? 160 : isTablet7 ? 130 : 100,
    mascotLg:  isTablet10 ? 220 : isTablet7 ? 180 : 140,

    // Font scale multiplier
    fontScale: isTablet10 ? 1.25 : isTablet7 ? 1.1 : 1,
  };
};
