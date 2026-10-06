import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";

const avatars = new Map<string, string>();

// A generated stand-in for anyone without a selfie yet, the same for a client id on every screen.
// Made in the browser rather than fetched from DiceBear's API, so it works on any wifi.
export function defaultAvatar(id: string) {
  let uri = avatars.get(id);
  if (!uri) avatars.set(id, (uri = createAvatar(thumbs, { seed: id }).toDataUri()));
  return uri;
}
