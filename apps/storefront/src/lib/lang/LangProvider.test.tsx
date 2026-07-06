import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { useIntl } from 'react-intl';

import { GlobalContext } from '@/shared/global';
import { setupStore } from '@/store';
import { initialState as globalInitialState } from '@/store/slices/global';
import { initState } from '@/shared/global/context/config';

import LangProvider from './LangProvider';

function TestNumber() {
  const intl = useIntl();

  return <span>{intl.formatNumber(1000.5)}</span>;
}

describe('LangProvider', () => {
  it('uses italian locale messages when the active locale is it', () => {
    window.history.pushState({}, '', '/it/quotes');

    const store = setupStore({
      global: {
        ...globalInitialState,
        locales: [
          { code: 'en', isDefault: true, fullPath: 'http://localhost/' },
          { code: 'it', isDefault: false, fullPath: 'http://localhost/it' },
        ],
      },
    });

    render(
      <GlobalContext.Provider value={{ state: { ...initState, bcLanguage: 'en' }, dispatch: vi.fn() }}>
        <Provider store={store}>
          <LangProvider>
            <TestNumber />
          </LangProvider>
        </Provider>
      </GlobalContext.Provider>,
    );

    expect(screen.getByText('1.000,5')).toBeInTheDocument();
  });
});
