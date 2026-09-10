const PDF_EXTENSION = /\.pdf$/i;

export function isPdfFile(fileName: string): boolean {
  return PDF_EXTENSION.test(fileName);
}

export function getDisplayedFileName(fileName: string): string {
  return fileName.replace(PDF_EXTENSION, '');
}
