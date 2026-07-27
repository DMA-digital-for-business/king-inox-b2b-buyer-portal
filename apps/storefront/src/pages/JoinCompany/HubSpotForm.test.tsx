import { createPortal } from 'react-dom';
import { builder, faker, fireEvent, renderWithProviders, waitFor } from 'tests/test-utils';

import { HubSpotForm } from './HubSpotForm';

const buildHubSpotFormPropsWith = builder(() => ({
  formId: faker.string.uuid(),
  unavailableMessage: faker.lorem.sentence(),
}));

describe('HubSpotForm', () => {
  afterEach(() => {
    document.getElementById('hubspot-join-company-form-script')?.remove();
  });

  it('loads and renders the HubSpot embed inside the portal iframe document', async () => {
    const props = buildHubSpotFormPropsWith({});
    const iframe = document.createElement('iframe');
    iframe.dataset.testHubspotFrame = 'true';
    document.body.appendChild(iframe);
    const iframeDocument = iframe.contentDocument;

    expect(iframeDocument).not.toBeNull();
    if (!iframeDocument) return;

    const { result } = renderWithProviders(
      createPortal(
        <HubSpotForm formId={props.formId} unavailableMessage={props.unavailableMessage} />,
        iframeDocument.body,
      ),
    );

    const script = iframeDocument.getElementById('hubspot-join-company-form-script');

    expect(iframeDocument.querySelector('.hs-form-frame')).not.toBeInTheDocument();
    expect(document.getElementById('hubspot-join-company-form-script')).not.toBeInTheDocument();
    expect(script?.getAttribute('src')).toBe('https://js-eu1.hsforms.net/forms/embed/139632051.js');

    if (script) fireEvent.load(script);

    await waitFor(() => {
      expect(iframeDocument.querySelector('.hs-form-frame')).toBeInTheDocument();
    });

    const form = iframeDocument.querySelector('.hs-form-frame');
    expect(form?.getAttribute('data-region')).toBe('eu1');
    expect(form?.getAttribute('data-form-id')).toBe(props.formId);
    expect(form?.getAttribute('data-portal-id')).toBe('139632051');

    result.unmount();
    iframe.remove();
  });
});
