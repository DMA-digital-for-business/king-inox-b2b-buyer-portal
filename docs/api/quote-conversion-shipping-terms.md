# Condizioni di trasporto nella conversione preventivo

## Stato dell’integrazione

Il portale implementa la conferma nel dettaglio preventivo e nella bozza e invia `shipping_terms` a `POST /api/v1/bigcommerce/quote-checkout`. Il backend non è stato modificato: il suo schema attuale è strict e rifiuta questo campo con HTTP 400. L’adeguamento backend descritto qui deve essere rilasciato prima di attivare questo flusso. La modale resta aperta in caso di errore della conversione.

## Richiesta

Autenticazione invariata: `Authorization: Bearer <current customer JWT>`.

```json
{
  "quote_id": 1061572,
  "createdAt": 1794229200,
  "shipping_terms": "porto_assegnato"
}
```

| Valore | Condizione di trasporto | Codice ERP |
| --- | --- | --- |
| `porto_franco` | Soglia raggiunta | `PF` |
| `porto_assegnato` | Scelta del cliente | `PA` |
| `porto_franco_con_addebito` | Scelta del cliente | `PFA` |

La proprietà resta opzionale nel client condiviso per compatibilità. Entrambi i percorsi del portale la valorizzano sempre: `/quoteDetail/:id` e `/quoteDraft`. Condividono il layout `QuotePage`, ma hanno handler di conversione distinti. La lista preventivi indirizza lo stato 0 a `/quoteDraft`. Nella bozza, il clic apre la modale senza creare preventivi o ordini; solo la conferma avvia la creazione del preventivo e la successiva conversione. Annullando non viene eseguita nessuna scrittura.

Il componente `pages/quote/components/QuoteActions` definisce una sola volta i pulsanti e gestisce apertura, annullamento e conferma della modale. `QuotePage` lo include per entrambi i percorsi. Le pagine passano callback esplicite per download, richiesta offerta e conversione, più i dati necessari a verificare il trasporto. La conferma chiude la modale soltanto se la callback di conversione restituisce successo; errori o validazioni fallite la mantengono aperta.

## Regola del portale

1. Legge gli extra field dell’indirizzo identificato da `shippingAddress.addressId` nella company del preventivo tramite GraphQL B2B, includendo tutte le pagine necessarie.
2. Legge `SOGLIA PORTOFRANCO` e `DESCRIZIONE PORTO`, normalizzando il nome con trim e maiuscole come lo storefront. Accetta importi con virgola/punto e separatori delle migliaia come il carrello del tema.
3. Se c’è una soglia numerica, recupera `GET /api/v1/bigcommerce/order-status` con JWT e somma `data[].amount_shipped_next_7_days`, ignorando i valori null.
4. Confronta il totale del preventivo (`totalAmount`) più la somma degli ordini con la soglia. Il calcolo è in centesimi. La soglia esatta è inclusa.
5. A soglia raggiunta imposta `porto_franco`; altrimenti richiede la selezione esplicita tra `porto_assegnato` e `porto_franco_con_addebito`. Non preseleziona un valore.
6. Indirizzo non disponibile, errori di lettura o importi degli ordini non validi impediscono la conferma. “Riprova” ripete la verifica. Chiudendo e riaprendo la modale si aggiorna la verifica e si azzera la scelta.

Fonte: branch `dev` di [king-inox-bc-theme](https://github.com/DMA-digital-for-business/king-inox-bc-theme/tree/dev), file `assets/js/theme/cart/shipping-estimator.js`, `cart/cart-primary-actions.js`, `common/b2b-gateway.js` e `common/order-status-gateway.js`.

## Adeguamento backend richiesto

- Accettare e validare l’enum `shipping_terms`; mantenere compatibilità con i chiamanti esistenti che lo omettono.
- Autorizzare la conversione come oggi e verificare lato server l’idoneità al porto franco usando l’indirizzo del quote e gli stessi importi qualificanti. Non fidarsi del solo valore del client.
- Prima della creazione dell’ordine, salvare il valore nel metafield del carrello generato dal quote: namespace `bc_storefront`, key `shipping_terms`. Il flusso da carrello del tema usa già questa convenzione.
- Garantire che il valore salvato venga letto dal mapping ERP dell’ordine e produca il relativo codice `PORTO`. Un errore di salvataggio deve interrompere il flusso prima della creazione ordine.
- Conservare risposte, autenticazione e gestione errori esistenti. Per una scelta non valida o non più applicabile restituire un errore prima della creazione dell’ordine.

I test del portale verificano modale, soglia e payload con API simulate. Non costituiscono una verifica della persistenza backend o del trasferimento ERP.
