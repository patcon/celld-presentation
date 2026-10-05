import { useEffect, useRef, useState } from "react";
import { DECK_SOCKET } from "../useDeck";

const SIZE = 384;

// Centre-crops a photo or video frame to a small square JPEG, so uploads stay quick on conference wifi.
// `mirror` flips it to match a mirrored camera preview.
function toSquareJpeg(source: CanvasImageSource, width: number, height: number, mirror = false): Promise<Blob> {
  const side = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  if (mirror) ctx.setTransform(-1, 0, 0, 1, SIZE, 0);
  ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode photo"))), "image/jpeg", 0.85),
  );
}

async function fileToJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    return await toSquareJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

// Phones open their own camera app from a file input with `capture`, which beats anything in-page.
// Desktop browsers ignore `capture` and show a file picker, so there we stream the webcam ourselves.
// getUserMedia needs a secure context (localhost or https), so plain-http LAN addresses get the picker.
const streamWebcam = () => !!navigator.mediaDevices?.getUserMedia && !matchMedia("(pointer: coarse)").matches;

type WebcamProps = { onCapture: (jpeg: Blob) => void; onCancel: () => void; onPickFile: () => void };

// A live, mirrored webcam preview cropped to the circle the selfie will appear in.
function Webcam({ onCapture, onCancel, onPickFile }: WebcamProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        stream = s;
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = async () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    onCapture(await toSquareJpeg(v, v.videoWidth, v.videoHeight, true));
  };

  // No webcam, or permission denied. The picker has to open from a click, so offer a button.
  if (failed) {
    return (
      <div className="webcam">
        <p className="selfie-error">Couldn't open your camera.</p>
        <div className="webcam-buttons">
          <button onClick={onPickFile}>Choose a photo</button>
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="webcam">
      <video ref={video} autoPlay playsInline muted />
      <div className="webcam-buttons">
        <button onClick={snap}>📸 Snap</button>
        <button className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type Status = "idle" | "camera" | "uploading" | "done" | "error";

// Takes a selfie (native camera on phones, the webcam on desktop) and uploads it to the Deck's bucket.
export function SelfieButton() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string>();

  const upload = async (getJpeg: () => Promise<Blob>) => {
    setStatus("uploading");
    try {
      const jpeg = await getJpeg();
      const res = await fetch(`/api/selfies/${encodeURIComponent(DECK_SOCKET.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: jpeg,
      });
      if (!res.ok) throw new Error(await res.text());
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(jpeg);
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const pickFile = () => {
    setStatus(preview ? "done" : "idle");
    input.current?.click();
  };

  return (
    <div className="selfie">
      {status === "camera" ? (
        <Webcam
          onCapture={(jpeg) => upload(async () => jpeg)}
          onCancel={() => setStatus(preview ? "done" : "idle")}
          onPickFile={pickFile}
        />
      ) : (
        preview && <img src={preview} alt="Your selfie" />
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(() => fileToJpeg(file));
        }}
      />
      {status !== "camera" && (
        <button onClick={() => (streamWebcam() ? setStatus("camera") : pickFile())} disabled={status === "uploading"}>
          {status === "uploading" ? "Sending…" : preview ? "📸 Retake selfie" : "📸 Take a selfie"}
        </button>
      )}
      {status === "error" && <p className="selfie-error">That didn't send. Try again?</p>}
    </div>
  );
}
