import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const colors = {
  brand: {
    50: '#E9E3FF',
    100: '#CDBEFF',
    200: '#B099FF',
    300: '#9474FF',
    400: '#774FFF',
    500: '#4318FF', // Horizon Blue (Primary)
    600: '#3A14D9',
    700: '#3210B3',
    800: '#290C8C',
    900: '#210866',
  },
  secondary: {
    500: '#7551FF', // Secondary Purple for tags
  },
  success: {
    500: '#01B574', // Green for Grounded
  },
  warning: {
    500: '#FFB547', // Orange for Warning
  },
  error: {
    500: '#E31A1A', // Red for Hallucination
  },
  glass: {
    100: 'rgba(255, 255, 255, 0.1)', // Light Mode Card Bg
    200: 'rgba(255, 255, 255, 0.2)', // Hover state
    300: 'rgba(255, 255, 255, 0.08)', // Border
    400: 'rgba(255, 255, 255, 0.6)', // Text muted
    500: 'rgba(255, 255, 255, 0.8)',
    600: 'rgba(11, 20, 55, 0.4)', // Dark Mode Card Bg
    700: 'rgba(11, 20, 55, 0.6)', // Dark Mode Hover
    800: 'rgba(11, 20, 55, 0.8)', 
    900: 'rgba(11, 20, 55, 0.9)', 
  },
};

const styles = {
  global: (props: any) => ({
    body: {
      bg: mode('gray.50', '#050A20')(props), // Deeper navy for dark mode
      color: mode('gray.700', 'whiteAlpha.900')(props),
      fontFamily: 'DM Sans, sans-serif',
    },
  }),
};

const fonts = {
  heading: 'DM Sans, sans-serif',
  body: 'DM Sans, Noto Sans TC, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'xl',
    },
    variants: {
      brand: (props: any) => ({
        bgGradient: mode(
          'linear(to-r, brand.500, brand.400)',
          'linear(to-r, brand.400, brand.300)'
        )(props),
        color: 'white',
        _hover: {
          bgGradient: mode(
            'linear(to-r, brand.600, brand.500)',
            'linear(to-r, brand.500, brand.400)'
          )(props),
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          transform: 'translateY(0)',
        },
      }),
    },
  },
  Card: {
    baseStyle: (props: any) => ({
      container: {
        borderRadius: '24px',
        boxShadow: mode(
          '0px 4px 20px rgba(112, 144, 176, 0.12)',
          'unset'
        )(props),
        bg: mode('white', '#111C44')(props),
        border: mode('none', '1px solid rgba(255, 255, 255, 0.05)')(props),
        transition: 'all 0.2s ease-in-out',
        _hover: {
             transform: 'translateY(-2px)',
             boxShadow: mode(
               '0px 10px 30px rgba(112, 144, 176, 0.15)',
               'unset'
             )(props),
        }
      },
      header: {
          paddingBottom: '0px',
      },
      body: {
          paddingTop: '0px',
      }
    }),
  },
};

const theme = extendTheme({ config, colors, styles, fonts, components });

export default theme;
