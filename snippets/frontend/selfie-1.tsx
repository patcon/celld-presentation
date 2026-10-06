export function Selfie({ id }: { id: string }) {
  const upload = (file: File) =>
    fetch(`/selfies/${id}`, { method: "PUT", body: file });

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => upload(e.target.files![0])}
    />
  );
}
