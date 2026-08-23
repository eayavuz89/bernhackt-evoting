import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useA11y } from "../context/AccessibilityContext";

// Camera QR scanner for the voting-card deep link. Opens the rear camera,
// samples frames onto a canvas and decodes with jsQR (pure JS — works in every
// browser, no BarcodeDetector dependency). Presented as a modal dialog with the
// same semantics as the legal dialog: focus trap entry, Escape closes, status
// announced via aria-live for screen-reader users.
export default function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const a = useA11y();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (video && ctx && video.readyState >= video.HAVE_ENOUGH_DATA && !doneRef.current) {
        // Decode at reduced resolution — plenty for a big card QR, much cheaper.
        const w = Math.min(640, video.videoWidth || 640);
        const h = Math.round(w * ((video.videoHeight || 480) / (video.videoWidth || 640)));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const hit = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (hit?.data) {
          doneRef.current = true;
          onResult(hit.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => {});
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((e) => {
        setError(
          e?.name === "NotAllowedError" || e?.name === "SecurityError"
            ? a.tr("scanQrDenied")
            : a.tr("scanQrError")
        );
      });

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-scan"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="scanTitle" className="dialog-title">
          📷 {a.tr("scanQrTitle")}
        </h2>
        <div className="scan-viewport">
          {/* muted+playsInline so mobile browsers allow inline autoplay */}
          <video ref={videoRef} muted playsInline aria-hidden="true" />
          <div className="scan-frame" aria-hidden="true" />
        </div>
        <p className="dialog-note" aria-live="polite">
          {error ? `⚠️ ${error}` : a.tr("scanQrHint")}
        </p>
        <div className="dialog-actions">
          <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
            {a.tr("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
