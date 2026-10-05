import { useRef, useState } from "react";
import { DECK_SOCKET } from "../useDeck";

const SIZE = 384;

// Centre-crops the photo to a small square JPEG, so uploads stay quick on conference wifi.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode photo"))), "image/jpeg", 0.85),
  );
}

type Status = "idle" | "uploading" | "done" | "error";

// Opens the front camera on phones (a file picker elsewhere) and uploads the shot to the Deck's bucket.
export function SelfieButton() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string>();

  const upload = async (file: File) => {
    setStatus("uploading");
    try {
      const jpeg = await toSquareJpeg(file);
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

  return (
    <div className="selfie">
      {preview && <img src={preview} alt="Your selfie" />}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <button onClick={() => input.current?.click()} disabled={status === "uploading"}>
        {status === "uploading" ? "Sending…" : preview ? "📸 Retake selfie" : "📸 Take a selfie"}
      </button>
      {status === "error" && <p className="selfie-error">That didn't send. Try again?</p>}
    </div>
  );
}
