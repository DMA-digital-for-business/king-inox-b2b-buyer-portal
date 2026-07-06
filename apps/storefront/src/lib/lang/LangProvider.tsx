import { ReactNode, useContext } from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from 'react-redux';

import { GlobalContext } from '@/shared/global';
import { Locales } from '@/store/slices/global';

import locales from './locales';

interface LangProviderProps {
  readonly children: ReactNode;
  readonly customText?: Record<string, string>;
}

type Translations = Record<string, string>;

interface RootState {
  global: {
    locales: Locales;
  };
  lang: {
    translations: Translations;
  };
}

const getActiveLocaleCode = (availableLocales: Locales) => {
  const activeLocale = [...availableLocales]
    .sort((a, b) => b.fullPath.length - a.fullPath.length)
    .find((locale) => {
      const { href } = window.location;
      if (!href.startsWith(locale.fullPath)) {
        return false;
      }

      const nextCharacter = href[locale.fullPath.length];

      return (
        nextCharacter === undefined ||
        nextCharacter === '/' ||
        nextCharacter === '#' ||
        nextCharacter === '?'
      );
    });

  return activeLocale?.code;
};

function LangProvider({ children, customText = {} }: LangProviderProps) {
  const {
    state: { bcLanguage },
  } = useContext(GlobalContext);
  const translations = useSelector<RootState, Translations>(({ lang }) => lang.translations);
  const availableLocales = useSelector<RootState, Locales>(({ global }) => global.locales);
  const activeLocaleCode = getActiveLocaleCode(availableLocales) ?? bcLanguage ?? 'en';
  const normalizedLocaleCode = activeLocaleCode.split('-')[0];
  const localeMessages =
    normalizedLocaleCode === 'it' ? { ...locales.en, ...locales.it } : locales.en;

  return (
    <IntlProvider
      defaultLocale="en"
      locale={normalizedLocaleCode}
      messages={{ ...localeMessages, ...customText, ...translations }}
    >
      {children}
    </IntlProvider>
  );
}

export default LangProvider;
