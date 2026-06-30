import { ReactNode, useContext } from 'react';
import * as materialMultiLanguages from '@mui/material/locale';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { CustomStyleContext } from './shared/customStyleButton';
import { BROWSER_LANG } from './constants';

type LangMapType = {
  [index: string]: string;
};

const MUI_LANG_MAP: LangMapType = {
  en: 'enUS',
  zh: 'zhCN',
  fr: 'frFR',
  nl: 'nlNL',
  de: 'deDE',
  it: 'itIT',
  es: 'esES',
};

type MaterialMultiLanguagesType = {
  [K: string]: materialMultiLanguages.Localization;
};

type Props = {
  children?: ReactNode;
};

function B3ThemeProvider({ children }: Props) {
  const {
    state: {
      portalStyle: { backgroundColor = '', primaryColor = '' },
    },
  } = useContext(CustomStyleContext);

  const brandPrimary = primaryColor || '#0D4372';
  const brandPrimaryDark = '#052940';
  const brandPrimarySoft = '#EDF4FA';
  const brandAccent = '#F47B20';
  const surfaceBase = backgroundColor || '#F5F7FB';
  const surfaceRaised = '#FFFFFF';
  const borderSubtle = '#D8D7DD';
  const borderStrong = '#BDC8DF';
  const textPrimary = '#12100C';
  const textSecondary = '#6C6B73';

  const theme = (lang: string) =>
    createTheme(
      {
        palette: {
          mode: 'light',
          background: {
            default: surfaceBase,
            paper: surfaceRaised,
          },
          primary: {
            main: brandPrimary,
            dark: brandPrimaryDark,
            light: brandPrimarySoft,
            contrastText: '#FFFFFF',
          },
          secondary: {
            main: brandAccent,
            contrastText: '#FFFFFF',
          },
          text: {
            primary: textPrimary,
            secondary: textSecondary,
          },
          divider: borderSubtle,
          success: {
            main: '#1F7A4C',
          },
          warning: {
            main: '#C97A10',
          },
          error: {
            main: '#B93636',
          },
          info: {
            main: brandPrimary,
          },
        },
        shape: {
          borderRadius: 4,
        },
        typography: {
          fontFamily: '"DM Sans","Public Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
          h1: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          },
          h2: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          },
          h3: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          },
          h4: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          },
          h5: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
          },
          h6: {
            fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 700,
          },
          button: {
            fontFamily: '"DM Sans","Public Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
            letterSpacing: 0,
            textTransform: 'none',
          },
          subtitle1: {
            fontWeight: 600,
          },
          subtitle2: {
            fontWeight: 600,
          },
          caption: {
            fontFamily: '"Public Sans","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
          },
          overline: {
            fontFamily: '"Public Sans","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              ':root': {
                '--king-primary': brandPrimary,
                '--king-primary-dark': brandPrimaryDark,
                '--king-primary-soft': brandPrimarySoft,
                '--king-accent': brandAccent,
                '--king-surface': surfaceBase,
                '--king-paper': surfaceRaised,
                '--king-border': borderSubtle,
                '--king-border-strong': borderStrong,
                '--king-text': textPrimary,
                '--king-text-muted': textSecondary,
                '--king-radius-sm': '4px',
                '--king-radius-md': '4px',
                '--king-radius-lg': '4px',
                colorScheme: 'light',
              },
              'html, body': {
                backgroundColor: surfaceBase,
                color: textPrimary,
                fontFamily: '"DM Sans","Public Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              body: {
                margin: 0,
              },
              'h1, h2, h3, h4, h5, h6': {
                color: textPrimary,
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              '.MuiTypography-h1, .MuiTypography-h2, .MuiTypography-h3, .MuiTypography-h4, .MuiTypography-h5, .MuiTypography-h6': {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              a: {
                color: brandPrimary,
                textDecorationThickness: '0.08em',
                textUnderlineOffset: '0.2em',
              },
              '::selection': {
                backgroundColor: brandPrimarySoft,
              },
            },
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 4,
                boxShadow: 'none',
                padding: '10px 16px',
              },
              containedPrimary: {
                backgroundColor: brandPrimary,
                '&:hover': {
                  backgroundColor: brandPrimaryDark,
                },
              },
              outlined: {
                borderColor: borderStrong,
              },
              outlinedPrimary: {
                color: brandPrimary,
                backgroundColor: surfaceRaised,
                '&:hover': {
                  borderColor: brandPrimary,
                  backgroundColor: brandPrimarySoft,
                },
              },
            },
          },
          MuiTypography: {
            styleOverrides: {
              h1: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              h2: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              h3: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              h4: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              h5: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
              h6: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              rounded: {
                borderRadius: 4,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 4,
                border: `1px solid ${borderStrong}`,
                boxShadow: '0 12px 32px rgba(5, 41, 64, 0.06)',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                backgroundColor: surfaceRaised,
                minHeight: 40,
                color: textPrimary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: borderSubtle,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandPrimary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandPrimary,
                  borderWidth: '1px',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#F8F9FB',
                },
              },
              input: {
                padding: '16px 16px',
                fontSize: '14px',
                lineHeight: 1.4,
                '&::placeholder': {
                  color: textSecondary,
                  opacity: 1,
                },
              },
            },
          },
          MuiFilledInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                backgroundColor: surfaceRaised,
                minHeight: 40,
                border: `1px solid ${borderSubtle}`,
                overflow: 'hidden',
                '&:before, &:after': {
                  display: 'none',
                },
                '&:hover': {
                  backgroundColor: surfaceRaised,
                },
                '&.Mui-focused': {
                  backgroundColor: surfaceRaised,
                  borderColor: brandPrimary,
                },
                '&.Mui-disabled': {
                  backgroundColor: '#F8F9FB',
                },
              },
              input: {
                padding: '16px 16px',
                fontSize: '14px',
                lineHeight: 1.4,
                '&::placeholder': {
                  color: textSecondary,
                  opacity: 1,
                },
              },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              input: {
                fontFamily: '"DM Sans","Public Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                color: textSecondary,
                fontSize: '14px',
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              select: {
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                padding: '8px 40px 8px 16px',
                fontSize: '14px',
                lineHeight: 1.4,
              },
              icon: {
                color: brandPrimary,
                right: 12,
              },
            },
          },
          MuiFormHelperText: {
            styleOverrides: {
              root: {
                marginLeft: 2,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 600,
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 4,
                border: `1px solid ${borderSubtle}`,
                boxShadow: '0 24px 64px rgba(5, 41, 64, 0.16)',
              },
            },
          },
          MuiDialogTitle: {
            styleOverrides: {
              root: {
                fontFamily: '"Space Grotesk","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
                fontWeight: 700,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                color: textPrimary,
                fontWeight: 700,
                borderBottom: `1px solid ${borderStrong}`,
              },
              body: {
                borderBottom: `1px solid ${borderSubtle}`,
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                height: 3,
                borderRadius: 999,
                backgroundColor: brandPrimary,
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                color: textSecondary,
                '&.Mui-selected': {
                  color: brandPrimary,
                },
              },
            },
          },
          MuiCheckbox: {
            defaultProps: {
              color: 'primary',
            },
          },
          MuiRadio: {
            defaultProps: {
              color: 'primary',
            },
          },
          MuiSwitch: {
            styleOverrides: {
              switchBase: {
                '&.Mui-checked': {
                  color: brandPrimary,
                },
                '&.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: brandPrimary,
                },
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 4,
                backgroundColor: brandPrimaryDark,
                fontFamily: '"Public Sans","DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif',
              },
            },
          },
        },
      },
      (materialMultiLanguages as MaterialMultiLanguagesType)[MUI_LANG_MAP[lang] || 'enUS'],
    );

  return <ThemeProvider theme={theme(BROWSER_LANG)}>{children}</ThemeProvider>;
}

export default B3ThemeProvider;
