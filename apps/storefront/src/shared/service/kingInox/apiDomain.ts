const DEV_KING_INOX_API_DOMAIN = 'https://1k4mxza2e2.execute-api.eu-central-1.amazonaws.com/dev';
const STAGING_KING_INOX_API_DOMAIN =
  'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';

const DEV_HOSTNAMES = new Set([
  'king-inox.mybigcommerce.com',
  'king-inox-en-1874693.mybigcommerce.com',
]);
const STAGING_HOSTNAMES = new Set([
  'king-spa-b2b-sandbox-1.mybigcommerce.com',
  'king-spa---b2b-sandbox-1---english-1878633.mybigcommerce.com',
]);

function getRuntimeStorefrontHostname(): string {
  const storeBaseUrl = document.body?.dataset.storeBaseUrl?.trim();
  if (storeBaseUrl) {
    try {
      return new URL(storeBaseUrl).hostname.trim().toLowerCase();
    } catch {
      // Fall back to the current page when the theme has no valid storefront URL.
    }
  }
  return window.location.hostname.trim().toLowerCase();
}

function getRuntimeStorefrontEnvironment(): 'dev' | 'staging' | 'prod' {
  const runtimeEnvironment: unknown = Reflect.get(window, '__RUNTIME_STOREFRONT_ENV__');
  const explicitEnvironment =
    typeof runtimeEnvironment === 'string' ? runtimeEnvironment.trim().toLowerCase() : '';
  if (
    explicitEnvironment === 'dev' ||
    explicitEnvironment === 'staging' ||
    explicitEnvironment === 'prod'
  ) {
    return explicitEnvironment;
  }
  const hostname = getRuntimeStorefrontHostname();
  if (DEV_HOSTNAMES.has(hostname)) return 'dev';
  if (STAGING_HOSTNAMES.has(hostname)) return 'staging';
  return 'prod';
}

export function getCurrentApiDomain(): string {
  const environment = getRuntimeStorefrontEnvironment();
  if (environment === 'dev') return DEV_KING_INOX_API_DOMAIN;
  if (environment === 'staging') return STAGING_KING_INOX_API_DOMAIN;
  // TODO: return PROD_KING_INOX_API_DOMAIN when the production API is available.
  return STAGING_KING_INOX_API_DOMAIN;
}

export function getCurrentApiClientId(): string {
  return getRuntimeStorefrontEnvironment() === 'dev'
    ? 'g6gl9yq2dmanydpcmabfyik10wj6dxf'
    : 'ooty5p0sanjii578e42z4mqbjj527av';
}
