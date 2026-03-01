import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#EDF1FF',
    100: '#D6E0FF',
    200: '#B6C8FF',
    300: '#90ACFF',
    400: '#688AF8',
    500: '#1337EC',
    600: '#0F2EC7',
    700: '#0C24A2',
    800: '#0A1D7A',
    900: '#071552',
  },
  success: {
    500: '#15803D',
  },
  warning: {
    500: '#B45309',
  },
  error: {
    500: '#B91C1C',
  },
  surface: {
    50: '#F7F8FC',
    100: '#EFF2F9',
    200: '#E4E9F5',
    300: '#D5DDEE',
    400: '#A6B2CB',
    500: '#7D8BA8',
    600: '#47566F',
    700: '#2B3649',
    800: '#1A2333',
    900: '#101827',
  },
  glass: {
    100: 'rgba(255, 255, 255, 0.45)',
    200: 'rgba(255, 255, 255, 0.7)',
    300: 'rgba(20, 35, 67, 0.08)',
    400: 'rgba(15, 23, 42, 0.7)',
  },
};

const semanticTokens = {
  colors: {
    'bg.canvas': { default: 'surface.50', _dark: 'surface.900' },
    'bg.sidebar': { default: 'white', _dark: 'surface.800' },
    'bg.panel': { default: 'white', _dark: 'surface.800' },
    'border.subtle': { default: 'surface.200', _dark: 'surface.700' },
    'text.primary': { default: 'surface.700', _dark: 'whiteAlpha.900' },
    'text.secondary': { default: 'surface.500', _dark: 'surface.300' },
  },
  shadows: {
    'panel.base': {
      default: '0 8px 24px rgba(17, 24, 39, 0.08)',
      _dark: '0 8px 30px rgba(2, 6, 23, 0.35)',
    },
  },
  radii: {
    panel: '12px',
  },
};

const styles = {
  global: (props: Record<string, unknown>) => ({
    body: {
      bg: mode('surface.50', 'surface.900')(props),
      color: mode('surface.700', 'whiteAlpha.900')(props),
      fontFamily: 'Manrope, Noto Sans TC, sans-serif',
      backgroundImage: mode(
        'radial-gradient(circle at 3% 4%, rgba(19, 55, 236, 0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(15, 46, 199, 0.06), transparent 42%)',
        'radial-gradient(circle at 2% 5%, rgba(104, 138, 248, 0.15), transparent 40%), radial-gradient(circle at 90% 95%, rgba(15, 46, 199, 0.14), transparent 40%)'
      )(props),
      minHeight: '100vh',
    },
    '#root': {
      minHeight: '100vh',
    },
  }),
};

const fonts = {
  heading: 'Manrope, Noto Sans TC, sans-serif',
  body: 'Manrope, Noto Sans TC, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: '10px',
    },
    variants: {
      brand: {
        bg: 'brand.500',
        color: 'white',
        _hover: { bg: 'brand.600', transform: 'translateY(-1px)' },
        _active: { bg: 'brand.700', transform: 'translateY(0)' },
      },
    },
    defaultProps: {
      colorScheme: 'brand',
    },
  },
  Card: {
    baseStyle: (props: Record<string, unknown>) => ({
      container: {
        bg: mode('white', 'surface.800')(props),
        border: '1px solid',
        borderColor: mode('surface.200', 'surface.700')(props),
        borderRadius: '12px',
        boxShadow: mode('0 8px 24px rgba(17, 24, 39, 0.08)', '0 8px 30px rgba(2, 6, 23, 0.35)')(props),
        transition: 'all 0.2s ease',
      },
      header: {
        pb: 0,
      },
      body: {
        pt: 0,
      },
    }),
  },
  Input: {
    variants: {
      outline: (props: Record<string, unknown>) => ({
        field: {
          bg: mode('white', 'surface.800')(props),
          borderColor: mode('surface.200', 'surface.700')(props),
          _hover: {
            borderColor: mode('surface.300', 'surface.600')(props),
          },
          _focusVisible: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      }),
    },
  },
  Table: {
    variants: {
      simple: (props: Record<string, unknown>) => ({
        th: {
          color: mode('surface.500', 'surface.300')(props),
          borderColor: mode('surface.200', 'surface.700')(props),
          fontSize: 'xs',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontWeight: '700',
        },
        td: {
          borderColor: mode('surface.200', 'surface.700')(props),
          color: mode('surface.700', 'surface.100')(props),
        },
      }),
    },
  },
  Tabs: {
    variants: {
      enclosed: (props: Record<string, unknown>) => ({
        tab: {
          borderColor: 'transparent',
          bg: mode('surface.100', 'surface.800')(props),
          color: mode('surface.600', 'surface.200')(props),
          _selected: {
            bg: mode('white', 'surface.700')(props),
            color: 'brand.500',
            borderColor: mode('surface.200', 'surface.700')(props),
          },
        },
      }),
    },
  },
  Drawer: {
    baseStyle: (props: Record<string, unknown>) => ({
      dialog: {
        bg: mode('white', 'surface.800')(props),
      },
    }),
  },
};

const theme = extendTheme({
  config,
  colors,
  semanticTokens,
  styles,
  fonts,
  components,
});

export default theme;
