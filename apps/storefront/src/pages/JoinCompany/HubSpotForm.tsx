import { useEffect, useRef, useState } from 'react';
import { Alert, Box } from '@mui/material';

const HUBSPOT_PORTAL_ID = '139632051';
const HUBSPOT_REGION = 'eu1';
const HUBSPOT_SCRIPT_ID = 'hubspot-join-company-form-script';
const HUBSPOT_SCRIPT_SRC = `https://js-eu1.hsforms.net/forms/embed/${HUBSPOT_PORTAL_ID}.js`;
const HUBSPOT_SCRIPT_READY_EVENT = 'hubspot-join-company-script-ready';

interface HubSpotFormProps {
  formId: string;
  unavailableMessage: string;
}

export function HubSpotForm({ formId, unavailableMessage }: HubSpotFormProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);

  useEffect(() => {
    const ownerDocument = mountRef.current?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (!ownerDocument || !ownerWindow) return undefined;

    const existingScriptElement = ownerDocument.getElementById(HUBSPOT_SCRIPT_ID);
    const existingScript =
      existingScriptElement instanceof HTMLScriptElement ? existingScriptElement : undefined;

    const handleReady = () => setIsScriptReady(true);
    const handleError = () => setHasError(true);
    ownerWindow.addEventListener(HUBSPOT_SCRIPT_READY_EVENT, handleReady);

    if (existingScript?.src === HUBSPOT_SCRIPT_SRC) {
      const hasAlreadyLoaded =
        existingScript.dataset.loaded === 'true' ||
        ownerWindow.performance.getEntriesByName(HUBSPOT_SCRIPT_SRC).length > 0;

      if (hasAlreadyLoaded) {
        setIsScriptReady(true);
      } else {
        existingScript.addEventListener('error', handleError);
      }

      return () => {
        ownerWindow.removeEventListener(HUBSPOT_SCRIPT_READY_EVENT, handleReady);
        existingScript.removeEventListener('error', handleError);
      };
    }

    existingScript?.remove();

    const script = document.createElement('script');
    script.id = HUBSPOT_SCRIPT_ID;
    script.src = HUBSPOT_SCRIPT_SRC;
    script.defer = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        ownerWindow.dispatchEvent(new ownerWindow.Event(HUBSPOT_SCRIPT_READY_EVENT));
      },
      { once: true },
    );
    script.addEventListener('error', handleError);
    ownerDocument.body.appendChild(script);

    return () => {
      ownerWindow.removeEventListener(HUBSPOT_SCRIPT_READY_EVENT, handleReady);
      script.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <Box ref={mountRef}>
      {hasError && <Alert severity="warning">{unavailableMessage}</Alert>}
      {!hasError && !isScriptReady && <Box sx={{ minHeight: 240 }} />}
      {!hasError && isScriptReady && (
        <Box
          className="hs-form-frame"
          data-region={HUBSPOT_REGION}
          data-form-id={formId}
          data-portal-id={HUBSPOT_PORTAL_ID}
          sx={{ minHeight: 240 }}
        />
      )}
    </Box>
  );
}
