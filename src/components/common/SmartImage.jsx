import { useEffect, useState } from 'react';
import { DEFAULT_PROPERTY_IMAGE } from '../../data/projectImages';

/**
 * Reliable <img> that never shows a broken-image icon.
 * Falls back to an existing local project placeholder when the
 * source is missing or fails to load.
 */
export default function SmartImage({
  src,
  alt = '',
  fallbackSrc = DEFAULT_PROPERTY_IMAGE,
  loading = 'lazy',
  className = '',
  ...rest
}) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  return (
    <img
      src={src && !errored ? src : fallbackSrc}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
