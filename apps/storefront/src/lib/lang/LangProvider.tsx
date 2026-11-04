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
  const localizedMessages = locales[normalizedLocaleCode as keyof typeof locales] ?? {};
  const localeMessages = { ...locales.en, ...localizedMessages };
  // Channel customizations are not locale-specific, including persisted API translations.
  // In a multilingual channel, even the default locale may differ from their content language.
  const useChannelCustomizations =
    availableLocales.length <= 1 && normalizedLocaleCode === (bcLanguage ?? 'en').split('-')[0];
  const messages = useChannelCustomizations
    ? { ...localeMessages, ...customText, ...translations }
    : localeMessages;

  return (
    <IntlProvider defaultLocale="en" locale={normalizedLocaleCode} messages={messages}>
      {children}
    </IntlProvider>
  );
}

export default LangProvider;
