import { useIntl } from 'react-intl';
import { Provider } from 'react-redux';
import { builder, faker, render, screen } from 'tests/test-utils';

import { GlobalContext } from '@/shared/global';
import { initState } from '@/shared/global/context/config';
import { RootState, setupStore } from '@/store';
import { initialState as globalInitialState } from '@/store/slices/global';

import LangProvider from './LangProvider';

const buildGlobalWith = builder(() => globalInitialState);
const buildLocaleWith = builder(() => ({
  code: 'en',
  isDefault: false,
  fullPath: faker.internet.url(),
}));
const buildLangWith = builder<RootState['lang']>(() => ({
  translations: {},
  fetchedPages: [],
  translationVersion: 0,
  _persist: { version: -1, rehydrated: true },
}));

function TestNumber() {
  const intl = useIntl();

  return <span>{intl.formatNumber(10000.5)}</span>;
}

function TestOrders() {
  const intl = useIntl();

  return (
    <>
      <span>{intl.formatMessage({ id: 'global.navMenu.orders' })}</span>
      <h1>{intl.formatMessage({ id: 'global.orders.title' })}</h1>
    </>
  );
}

describe('LangProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses italian locale messages when the active locale is it', () => {
    vi.stubGlobal('location', { href: 'http://localhost/it/quotes' });

    const store = setupStore({
      global: buildGlobalWith({
        locales: [
          buildLocaleWith({ code: 'en', isDefault: true, fullPath: 'http://localhost/' }),
          buildLocaleWith({ code: 'it', fullPath: 'http://localhost/it' }),
        ],
      }),
    });

    render(
      <GlobalContext.Provider
        value={{ state: { ...initState, bcLanguage: 'en' }, dispatch: vi.fn() }}
      >
        <Provider store={store}>
          <LangProvider>
            <TestNumber />
          </LangProvider>
        </Provider>
      </GlobalContext.Provider>,
    );

    expect(screen.getByText('10.000,5')).toBeInTheDocument();
  });

  it.each([
    ['fr', 'Mes commandes'],
    ['es', 'Mis pedidos'],
    ['de', 'Meine Bestellungen'],
  ])('displays %s labels despite Italian channel customizations', (code, expectedLabel) => {
    const fullPath = `https://store.example.com/${code}`;
    vi.stubGlobal('location', { href: `${fullPath}/cart.php#/orders` });
    const store = setupStore({
      global: buildGlobalWith({
        locales: [
          buildLocaleWith({
            code: 'it',
            isDefault: true,
            fullPath: 'https://store.example.com/it',
          }),
          buildLocaleWith({ code, fullPath }),
        ],
      }),
      lang: buildLangWith({ translations: { 'global.navMenu.orders': 'I miei ordini' } }),
    });

    render(
      <GlobalContext.Provider
        value={{ state: { ...initState, bcLanguage: 'it' }, dispatch: vi.fn() }}
      >
        <Provider store={store}>
          <LangProvider customText={{ 'global.orders.title': 'I miei ordini' }}>
            <TestOrders />
          </LangProvider>
        </Provider>
      </GlobalContext.Provider>,
    );

    expect(screen.getAllByText(expectedLabel)).toHaveLength(2);
    expect(screen.queryByText('I miei ordini')).not.toBeInTheDocument();
  });

  it('preserves channel customizations in the channel language', () => {
    const navigationLabel = faker.lorem.words();
    const title = faker.lorem.sentence();
    const store = setupStore({
      global: buildGlobalWith({ locales: [] }),
      lang: buildLangWith({ translations: { 'global.navMenu.orders': navigationLabel } }),
    });

    render(
      <GlobalContext.Provider
        value={{ state: { ...initState, bcLanguage: 'it' }, dispatch: vi.fn() }}
      >
        <Provider store={store}>
          <LangProvider customText={{ 'global.orders.title': title }}>
            <TestOrders />
          </LangProvider>
        </Provider>
      </GlobalContext.Provider>,
    );

    expect(screen.getByText(navigationLabel)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
});
