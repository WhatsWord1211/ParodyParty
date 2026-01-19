import React, { useEffect, useRef } from 'react';

export default function QRCodeScanner({ onScan }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let scannerInstance = null;

    const setupScanner = async () => {
      try {
        const module = await import('html5-qrcode');
        if (!isMountedRef.current) return;

        const { Html5QrcodeScanner } = module;
        scannerInstance = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 240, height: 240 }
          },
          false
        );

        scannerInstance.render(
          (decodedText) => {
            if (onScan) onScan(decodedText);
          },
          () => {}
        );
      } catch (error) {
        console.error('Failed to initialize QR scanner:', error);
      }
    };

    setupScanner();

    return () => {
      isMountedRef.current = false;
      if (scannerInstance?.clear) {
        scannerInstance.clear().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="qr-scanner">
      <p className="center">Allow camera access to scan a QR code.</p>
      <div id="qr-reader" />
    </div>
  );
}

