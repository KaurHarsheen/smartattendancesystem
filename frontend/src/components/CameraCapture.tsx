import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

interface Props {
  onCapture: (dataUrl: string) => Promise<void> | void;
  busy?: boolean;
  label?: string;
  description?: string;
  captureLabel?: string;
}

export function CameraCapture({
  onCapture,
  busy = false,
  label = "Camera",
  description,
  captureLabel = "Capture",
}: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [streamState, setStreamState] = useState<"idle" | "ready" | "error">("idle");

  const handleCapture = useCallback(async () => {
    if (busy) return;
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      await onCapture(screenshot);
    }
  }, [busy, onCapture]);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="h-64 w-full bg-slate-900 object-cover"
          onUserMedia={() => setStreamState("ready")}
          onUserMediaError={() => setStreamState("error")}
          videoConstraints={{
            width: 640,
            height: 360,
            facingMode: "user",
          }}
        />
        {streamState !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-center text-xs text-slate-200">
            {streamState === "error" ? "Camera unavailable. Allow access or close other apps." : "Waiting for camera permission…"}
          </div>
        )}
      </div>
      <button
        type="button"
        className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-500 disabled:opacity-60"
        onClick={handleCapture}
        disabled={busy}
      >
        {busy ? "Processing..." : captureLabel}
      </button>
    </div>
  );
}


