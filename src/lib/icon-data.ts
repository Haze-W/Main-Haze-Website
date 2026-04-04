/**
 * Minimal 16x16 32bpp ICO file for Tauri Windows builds.
 * A simple dark gray square - valid ICO format.
 */
export function getIconIcoBytes(): Uint8Array {
  // ICO: header(6) + dir(16) + BITMAPINFO(40) + XOR(1024) + AND(64)
  const andSize = Math.ceil(16 / 32) * 4 * 16; // 4 bytes/row * 16 rows = 64
  const imgSize = 40 + 1024 + andSize;
  const size = 6 + 16 + imgSize;
  const buf = new Uint8Array(size);
  let o = 0;

  // ICONDIR
  buf[o++] = 0;
  buf[o++] = 0;
  buf[o++] = 1;
  buf[o++] = 0;
  buf[o++] = 1;
  buf[o++] = 0;

  // ICONDIRENTRY
  buf[o++] = 16;
  buf[o++] = 16;
  buf[o++] = 0;
  buf[o++] = 0;
  buf[o++] = 1;
  buf[o++] = 0;
  buf[o++] = 32;
  buf[o++] = 0;
  buf[o++] = imgSize & 0xff;
  buf[o++] = (imgSize >> 8) & 0xff;
  buf[o++] = (imgSize >> 16) & 0xff;
  buf[o++] = (imgSize >> 24) & 0xff;
  buf[o++] = 22;
  buf[o++] = 0;
  buf[o++] = 0;
  buf[o++] = 0;

  // BITMAPINFOHEADER (40 bytes)
  const bih = [
    40, 0, 0, 0, 16, 0, 0, 0, 32, 0, 0, 0, 1, 0, 32, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];
  for (const b of bih) buf[o++] = b;

  // XOR: 16x16 BGRA bottom-up, dark gray
  const b = 0x3d, g = 0x36, r = 0x30, a = 255;
  for (let row = 15; row >= 0; row--) {
    for (let col = 0; col < 16; col++) {
      buf[o++] = b;
      buf[o++] = g;
      buf[o++] = r;
      buf[o++] = a;
    }
  }

  // AND mask
  for (let i = 0; i < andSize; i++) buf[o++] = 0;

  return buf;
}
