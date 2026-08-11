const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const RESIZE_MAX_DIMENSION = 1600;
const RESIZE_QUALITY = 0.8;
const RESIZE_THRESHOLD_BYTES = 800 * 1024; // only compress files bigger than this

function extensionAllowed(file, allowedExtensions) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return allowedExtensions.some((allowed) => allowed.toLowerCase() === ext) || DEFAULT_ACCEPTED_TYPES.includes(file.type);
}

export function validateImageFile(file, existingFingerprints = [], slotConstraints = {}) {
  const maxSizeMb = slotConstraints.maxFileSizeMb || 5;
  const allowedExtensions = slotConstraints.allowedExtensions || ['jpg', 'jpeg', 'png', 'webp'];

  if (!DEFAULT_ACCEPTED_TYPES.includes(file.type) || !extensionAllowed(file, allowedExtensions)) {
    return { valid: false, errorKey: 'media.error.invalidType' };
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return { valid: false, errorKey: 'media.error.tooLarge', errorParams: { size: maxSizeMb } };
  }
  const fingerprint = `${file.name}-${file.size}-${file.lastModified}`;
  if (existingFingerprints.includes(fingerprint)) {
    return { valid: false, errorKey: 'media.error.duplicate' };
  }
  return { valid: true, fingerprint };
}

/**
 * Reads a file as a data URL, downscaling and re-compressing it through a
 * canvas first if it's larger than RESIZE_THRESHOLD_BYTES — this keeps large
 * phone-camera photos from blowing through localStorage's quota once
 * base64-encoded (which inflates size by ~33% on top of the original).
 */
export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (file.size <= RESIZE_THRESHOLD_BYTES) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('media.error.readFailed'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > RESIZE_MAX_DIMENSION) {
          height = Math.round((height * RESIZE_MAX_DIMENSION) / width);
          width = RESIZE_MAX_DIMENSION;
        } else if (height > RESIZE_MAX_DIMENSION) {
          width = Math.round((width * RESIZE_MAX_DIMENSION) / height);
          height = RESIZE_MAX_DIMENSION;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', RESIZE_QUALITY));
      };
      img.onerror = () => reject(new Error('media.error.readFailed'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('media.error.readFailed'));
    reader.readAsDataURL(file);
  });
}
