import { Colors } from '../../constants/colors';

export const HomeTheme = {
  colors: {
    page: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceSoft: '#FFF7F0',

    primary: Colors.primary || '#FF6B35',
    primaryDark: Colors.primaryDark || '#D9480F',
    primaryLight: Colors.primaryLight || '#FF8F5E',
    primarySoft: Colors.primarySoft || '#FFF1EB',
    primaryBorder: '#FFD7B5',

    text: '#16181D',
    textSecondary: '#667085',
    textMuted: '#98A2B3',

    border: '#EAECF0',
    divider: '#F0F1F3',
    input: '#F5F6F8',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },

  radius: {
    small: 10,
    medium: 14,
    large: 18,
    banner: 22,
    sheet: 30,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
  },
};
