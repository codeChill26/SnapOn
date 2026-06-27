import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as rnUseColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { Spacing } from './spacing';
import { Radius } from './radius';
import { Typography } from './typography';
import { Shadows } from './shadows';

type ColorsType = typeof lightColors;

export interface Theme {
  dark: boolean;
  colors: ColorsType;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
  shadows: typeof Shadows;
}

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = rnUseColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemScheme === 'dark');

  useEffect(() => {
    setIsDark(systemScheme === 'dark');
  }, [systemScheme]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const colors = isDark ? darkColors : lightColors;

  const theme: Theme = {
    dark: isDark,
    colors,
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
    shadows: Shadows,
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

export const useColorScheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useColorScheme must be used within a ThemeProvider');
  }
  return {
    colorScheme: context.isDark ? ('dark' as const) : ('light' as const),
    isDark: context.isDark,
    toggleTheme: context.toggleTheme,
  };
};
