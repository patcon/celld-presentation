import { QRCodeSVG } from "qrcode.react";

// QR code linking to the audience view on whatever host is serving the slides.
export function JoinQrCode() {
  const url = `${location.origin}/participation`;
  return <QRCodeSVG value={url} className="join-qr" marginSize={2} title={url} />;
}
