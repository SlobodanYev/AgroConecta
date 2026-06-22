import { Platform } from 'react-native';

export const colors = {
  green900: '#0D4D28',
  green800: '#126431',
  green700: '#16763A',
  green600: '#218A46',
  green100: '#E8F4EA',
  green50: '#F3F9F3',
  white: '#FFFFFF',
  ink: '#132018',
  muted: '#67736B',
  line: '#DDE6DE',
  red: '#A62F2F',
};

export const shadows = {
  small: Platform.select({
    web: { boxShadow: '0 5px 16px rgba(20,60,33,.07)' },
    default: { shadowColor: '#143C21', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  }),
  medium: Platform.select({
    web: { boxShadow: '0 14px 28px rgba(22,118,58,.2)' },
    default: { shadowColor: '#16763A', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  }),
  nav: Platform.select({
    web: { boxShadow: '0 -8px 22px rgba(20,60,33,.07)' },
    default: { shadowColor: '#143C21', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  }),
};
