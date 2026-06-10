## Deploy

Il deploy del portale B2B viene eseguito automaticamente tramite **AWS Amplify** a seguito di una **push sul branch `main`** (ambiente di produzione).

Durante la build viene generata la cartella `dist` e la configurazione di **Vite** è impostata per **disabilitare l'hash nei nomi dei file generati**, in modo da mantenere invariati i path degli asset tra le diverse build.

## Ambiente locale vs remoto

Quando si passa dall'ambiente di sviluppo locale a quello remoto (o viceversa), è necessario **effettuare nuovamente il login**, poiché la sessione di autenticazione non viene condivisa tra i due ambienti.

Consiglio di aprire la console ed attendere che tutte le requests siano completate (non sono immediate) perché in locale non è molto reattivo.

## Variabili di configurazione

### `VITE_B2B_URL`

Endpoint dell'API B2B utilizzata dal portale.

```env
VITE_B2B_URL=https://api-b2b.bigcommerce.com
```

> Lasciare il valore di default (`https://api-b2b.bigcommerce.com`).

### `VITE_LOCAL_APP_CLIENT_ID`

Client ID utilizzato dall'applicazione in ambiente locale.

> Lasciare il valore di default configurato nel progetto.




## Script

### Produzione

Questi sono da aggiungere **SOLO** su produzione che puntano alla */dist*, per lo sviluppo non servono. Non possono convivere con gli script di sviluppo perché generano un comportamento inatteso.
**NB**: https://main.d3ioasbw4fm7q5.amplifyapp.com è l'app Amplify sulla quale viene hostata la cartella /dist

#### Header 

**Name**: Production Header Script Contents 

**Location**: All pages

**Placement**: Header


```js
<script>
var b2bHideBodyStyle = document.createElement('style');
b2bHideBodyStyle.id = 'b2b-account-page-hide-body';
{{#if customer.id}} 
  {{#contains page_type "account"}} 
    b2bHideBodyStyle.innerHTML = 'body { display: none !important }'; 
    document.head.appendChild(b2bHideBodyStyle); 
  {{/contains}}
{{/if}} 
{{#if page_type "login"}}
  b2bHideBodyStyle.innerHTML = 'body { display: none !important }'; 
  document.head.appendChild(b2bHideBodyStyle); 
{{/if}} 
const removeCart = () => { 
  const style = document.createElement('style'); 
  style.type = 'text/css'; 
  style.id = 'b2bPermissions-cartElement-id' 
  style.innerHTML='[href="/cart.php"], #form-action-addToCart, [data-button-type="add-cart"], .button--cardAdd, .card-figcaption-button, [data-emthemesmodez-cart-item-add], .add-to-cart-button { display: none !important }' 
  document.getElementsByTagName('head').item(0).appendChild(style);  
} 
removeCart()
</script>
```



#### Footer 

**Name**: Production Footer Script Contents

**Location**: All pages

**Placement**: Footer

```js
<script>
  window.b3CheckoutConfig = {
    routes: {
      dashboard: '/account.php?action=order_status',
    },
  }
  window.B3 = {
    setting: {
      store_hash: '{{settings.store_hash}}',  
      channel_id: {{settings.channel_id}}, 
      platform: 'bigcommerce'
    },
    'dom.checkoutRegisterParentElement': '#checkout-app',
    'dom.registerElement':
      '[href^="/login.php"], #checkout-customer-login, [href="/login.php"] .navUser-item-loginLabel, #checkout-customer-returning .form-legend-container [href="#"]',
    'dom.openB3Checkout': 'checkout-customer-continue',
    before_login_goto_page: '/account.php?action=order_status',
    checkout_super_clear_session: 'true',
    'dom.navUserLoginElement': '.navUser-item.navUser-item--account',
  }
</script>
<script
  type="module"
  crossorigin=""
  src="https://main.d3ioasbw4fm7q5.amplifyapp.com/index.js"
></script>
<script
  nomodule=""
  crossorigin=""
  src="https://main.d3ioasbw4fm7q5.amplifyapp.com/polyfills-legacy.js"
></script>
<script
  nomodule=""
  crossorigin=""
  src="https://main.d3ioasbw4fm7q5.amplifyapp.com/index-legacy.js"
></script>
```


### Sviluppo

#### Header

**Name**: Development B2B Edition Header Script

**Location**: All pages

**Placement**: Header

```js
<script>
  {{#if customer.id}}
  {{#contains page_type "account"}}
  var b2bHideBodyStyle = document.createElement('style');
  b2bHideBodyStyle.id = 'b2b-account-page-hide-body';
  b2bHideBodyStyle.innerHTML = 'body { display: none !important }';
  document.head.appendChild(b2bHideBodyStyle);
  {{/contains}}
  {{/if}}
</script>
<script type="module">
  import RefreshRuntime from 'http://localhost:3001/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>
<script type="module" src="http://localhost:3001/@vite/client"></script>
```

#### Footer

**Name**: Development B2B Edition Footer Script

**Location**: All pages

**Placement**: Footer

```js
<script type="module" src="http://localhost:3001/src/main.ts"></script>
<script>
  window.B3 = {
    setting: {
      store_hash: '{{settings.store_hash}}',
      channel_id: {{settings.channel_id}},
      platform: 'bigcommerce', // override this depending on your store channel platform: https://developer.bigcommerce.com/docs/rest-management/channels#platform
    },
  }
</script>
```