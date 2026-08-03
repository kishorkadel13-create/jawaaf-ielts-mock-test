import React, { useEffect, useState } from 'react';

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: React.ReactNode;
  hideOnError?: boolean;
};

export default function SafeImage({ src, fallback = null, hideOnError = false, onError, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return hideOnError ? null : <>{fallback}</>;
  }

  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}
