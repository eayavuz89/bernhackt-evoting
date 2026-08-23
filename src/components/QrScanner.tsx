import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useA11y } from "../context/AccessibilityContext";

// Camera QR scanner for the voting-card deep link. Opens the rear camera by
// default (a printed card is usually scanned with it), with a front/back flip
// button — e.g. to scan a QR shown on another screen. Frames are sampled onto a
// canvas and decoded with jsQR (pure JS — works in every browser, no
// BarcodeDetector dependency). Presented as a modal dialog with the same
// semantics as the legal dialog: focus trap entry, Escape closes, status
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
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  // Escape closes; focus starts on the close button.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)start the camera whenever the facing direction changes.
  useEffect(() => {
    let cancelled = false;
    setError("");

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
      .getUserMedia({ video: { facingMode: facing } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => {});
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e?.name === "NotAllowedError" || e?.name === "SecurityError"
            ? a.tr("scanQrDenied")
            : a.tr("scanQrError")
        );
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

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
          {/* muted+playsInline so mobile browsers allow inline autoplay; mirror
              the front camera preview like a native camera app */}
          <video
            ref={videoRef}
            muted
            playsInline
            aria-hidden="true"
            className={facing === "user" ? "mirrored" : undefined}
          />
          <div className="scan-frame" aria-hidden="true" />
        </div>
        <p className="dialog-note" aria-live="polite">
          {error ? `⚠️ ${error}` : a.tr("scanQrHint")}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-pressed={facing === "user"}
          >
            🔄 {facing === "environment" ? a.tr("scanQrFront") : a.tr("scanQrBack")}
          </button>
          <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
            {a.tr("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
