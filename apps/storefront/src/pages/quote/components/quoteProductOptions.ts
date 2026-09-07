function normalizeOptionLabel(label: string | undefined): string | undefined {
  return label
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

export function isYourCodeLabel(label: string | undefined): boolean {
  const normalizedLabel = normalizeOptionLabel(label);

  return Boolean(
    normalizedLabel &&
      (normalizedLabel.includes('vostro codice') ||
        normalizedLabel.includes('codice cliente') ||
        normalizedLabel.includes('your code')),
  );
}

export function isNotesLabel(label: string | undefined): boolean {
  const normalizedLabel = normalizeOptionLabel(label);

  return normalizedLabel === 'note' || normalizedLabel === 'notes';
}
