const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_SIZE_MB = 5;

export function validateDocumentFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
    return { valid: false, errorKey: 'media.error.invalidDocType' };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, errorKey: 'media.error.tooLarge', errorParams: { size: MAX_SIZE_MB } };
  }
  return { valid: true };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('media.error.readFailed'));
    reader.readAsDataURL(file);
  });
}
