import { useState } from "react";                                       // [!code ++]

export function Selfie({ id }: { id: string }) {
  const [version, setVersion] = useState<number>();                     // [!code ++]
                                                                        // [!code ++]
  const upload = (file: File) =>
    fetch(`/selfies/${id}`, { method: "PUT", body: file })
      .then(() => setVersion(Date.now()));                              // [!code ++]

  return (
    <>                                                                  {/* [!code ++] */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => upload(e.target.files![0])}
      />
      {version && <img src={`/selfies/${id}?v=${version}`} />}          {/* [!code ++] */}
    </>                                                                 // [!code ++]
  );
}
