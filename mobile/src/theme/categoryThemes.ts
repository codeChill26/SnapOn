import { AppColors } from './colors';

export interface CategoryTheme {
  primary: string;
  soft: string;
  border: string;
  iconColor: string;
  pattern: 'circuit' | 'creativeBlob' | 'editorial' | 'researchGrid' | 'learningShapes' | 'default';
  radius: number;
}

export const getCategoryThemeBySlug = (slug?: string, fallbackColor?: string): CategoryTheme => {
  const baseColor = fallbackColor || AppColors.brand.primary;
  const isTech = slug?.includes('tech') || slug?.includes('it');
  const isDesign = slug?.includes('design') || slug?.includes('thiet-ke') || slug?.includes('graphic');
  const isContent = slug?.includes('content') || slug?.includes('viet') || slug?.includes('write');
  const isResearch = slug?.includes('research') || slug?.includes('nghien-cuu') || slug?.includes('survey');
  const isStudy = slug?.includes('study') || slug?.includes('hoc') || slug?.includes('tutor') || slug?.includes('education');

  if (isTech) {
    return {
      primary: baseColor,
      soft: `${baseColor}1A`,
      border: `${baseColor}30`,
      iconColor: baseColor,
      pattern: 'circuit',
      radius: 16,
    };
  }
  if (isDesign) {
    return {
      primary: baseColor,
      soft: `${baseColor}1A`,
      border: `${baseColor}30`,
      iconColor: baseColor,
      pattern: 'creativeBlob',
      radius: 28,
    };
  }
  if (isContent) {
    return {
      primary: baseColor,
      soft: `${baseColor}1A`,
      border: `${baseColor}30`,
      iconColor: baseColor,
      pattern: 'editorial',
      radius: 20,
    };
  }
  if (isResearch) {
    return {
      primary: baseColor,
      soft: `${baseColor}1A`,
      border: `${baseColor}30`,
      iconColor: baseColor,
      pattern: 'researchGrid',
      radius: 16,
    };
  }
  if (isStudy) {
    return {
      primary: baseColor,
      soft: `${baseColor}1A`,
      border: `${baseColor}30`,
      iconColor: baseColor,
      pattern: 'learningShapes',
      radius: 24,
    };
  }
  return {
    primary: baseColor,
    soft: `${baseColor}14`,
    border: `${baseColor}24`,
    iconColor: baseColor,
    pattern: 'default',
    radius: 20,
  };
};
