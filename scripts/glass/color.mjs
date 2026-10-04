// Run in the browser: CSS.supports validates syntax, Canvas converts native colors to sRGB.
export function measureColor(value) {
  if (typeof value !== 'string' || !CSS.supports('color', value) || /^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(value.trim()) || /var\(/i.test(value)) throw Error('UNMEASURED_COLOR');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  if (!context) throw Error('UNMEASURED_COLOR');
  context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
  const rgba = [...context.getImageData(0, 0, 1, 1, { colorSpace: 'srgb' }).data];
  return { rgba, alpha: rgba[3] / 255 };
}
