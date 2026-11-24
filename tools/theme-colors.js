// Works out what a CSS filter does to Docs' white paper and black text.
//
// Usage:  node tools/theme-colors.js "invert(0.88) hue-rotate(180deg)"
//
// For a pageless theme, set --authored-bg to the "paper" colour printed here:
// the page then has exactly the background colour and only the text remains.
// Supports the filter functions the themes use: invert, sepia, saturate,
// hue-rotate, brightness, contrast, grayscale (per the CSS Filter Effects spec).

'use strict';

const clamp = (v) => Math.min(1, Math.max(0, v));

function matrix(m) {
  return ([r, g, b]) => [
    clamp(m[0] * r + m[1] * g + m[2] * b),
    clamp(m[3] * r + m[4] * g + m[5] * b),
    clamp(m[6] * r + m[7] * g + m[8] * b),
  ];
}

const FILTERS = {
  invert: (p) => (c) => c.map((v) => clamp(v * (1 - p) + (1 - v) * p)),
  brightness: (p) => (c) => c.map((v) => clamp(v * p)),
  contrast: (p) => (c) => c.map((v) => clamp((v - 0.5) * p + 0.5)),
  sepia: (p) => {
    const a = 1 - p;
    return matrix([
      0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a,
      0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a,
      0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a,
    ]);
  },
  grayscale: (p) => {
    const a = 1 - p;
    return matrix([
      0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a,
    ]);
  },
  saturate: (s) =>
    matrix([
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ]),
  'hue-rotate': (deg) => {
    const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    return matrix([
      0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
    ]);
  },
};

function parse(filter) {
  const steps = [];
  for (const [, name, arg] of filter.matchAll(/([a-z-]+)\(([^)]*)\)/g)) {
    if (!FILTERS[name]) throw new Error(`unsupported filter: ${name}`);
    const n = parseFloat(arg);
    const v = name === 'hue-rotate' ? n : arg.trim().endsWith('%') ? n / 100 : n;
    steps.push(FILTERS[name](v));
  }
  return (rgb) => steps.reduce((c, f) => f(c), rgb.map((v) => v / 255)).map((v) => Math.round(v * 255));
}

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

function apply(filter) {
  const f = parse(filter);
  return { paper: hex(f([255, 255, 255])), text: hex(f([0, 0, 0])) };
}

module.exports = { apply };

if (require.main === module) {
  const filter = process.argv.slice(2).join(' ');
  if (!filter) {
    console.log('usage: node tools/theme-colors.js "<css filter>"');
    process.exit(1);
  }
  const { paper, text } = apply(filter);
  console.log(`paper (use as --authored-bg for a pageless theme): ${paper}`);
  console.log(`text:                                              ${text}`);
}
