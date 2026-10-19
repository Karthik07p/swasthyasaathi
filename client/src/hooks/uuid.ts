/** Tiny crypto-based UUID v4 — no npm package needed */
export function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 1);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
