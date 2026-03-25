#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const BADGE_OUTPUT_PATH = path.join(process.cwd(), '.github', 'badges', 'coverage.svg');
const BADGE_LABEL = 'coverage';
const SVG_HEIGHT = 20;
const SVG_PADDING = 10;
const SVG_CHAR_WIDTH = 7;

/**
 * Exits the process with an error message.
 * @param message - Error message.
 */
function fail(message) {
  console.error(message);
  process.exit(1);
}

/**
 * Reads the overall line coverage percentage from the summary file.
 * @returns Line coverage percentage.
 */
function readCoveragePercentage() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    fail(`Coverage summary not found at ${COVERAGE_SUMMARY_PATH}. Run test coverage first.`);
  }

  const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
  return Number(summary.total.lines.pct);
}

/**
 * Returns a badge color for a coverage percentage.
 * @param coverage - Coverage percentage.
 * @returns Badge color.
 */
function getCoverageColor(coverage) {
  if (coverage >= 95) return '#2ea043';
  if (coverage >= 90) return '#97ca00';
  if (coverage >= 80) return '#dfb317';
  return '#e05d44';
}

/**
 * Returns the formatted badge value text.
 * @param coverage - Coverage percentage.
 * @returns Formatted value text.
 */
function getValueText(coverage) {
  return `${coverage.toFixed(2)}%`;
}

/**
 * Returns a conservative width estimate for badge text.
 * @param text - Badge text.
 * @returns Estimated width in pixels.
 */
function getTextWidth(text) {
  return text.length * SVG_CHAR_WIDTH + SVG_PADDING * 2;
}

/**
 * Escapes XML special characters in text content.
 * @param text - Raw text.
 * @returns Escaped text.
 */
function escapeXml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Builds the coverage badge SVG.
 * @param coverage - Coverage percentage.
 * @returns SVG markup.
 */
function buildBadgeSvg(coverage) {
  const valueText = getValueText(coverage);
  const labelWidth = getTextWidth(BADGE_LABEL);
  const valueWidth = getTextWidth(valueText);
  const totalWidth = labelWidth + valueWidth;
  const valueX = labelWidth + valueWidth / 2;
  const labelX = labelWidth / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${SVG_HEIGHT}" role="img" aria-label="${BADGE_LABEL}: ${valueText}">
  <linearGradient id="badge-gradient" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-opacity=".3"/>
    <stop offset="1" stop-opacity=".5"/>
  </linearGradient>
  <mask id="badge-mask">
    <rect width="${totalWidth}" height="${SVG_HEIGHT}" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#badge-mask)">
    <rect width="${labelWidth}" height="${SVG_HEIGHT}" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${SVG_HEIGHT}" fill="${getCoverageColor(coverage)}"/>
    <rect width="${totalWidth}" height="${SVG_HEIGHT}" fill="url(#badge-gradient)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="15">${escapeXml(BADGE_LABEL)}</text>
    <text x="${valueX}" y="15">${escapeXml(valueText)}</text>
  </g>
</svg>
`;
}

/**
 * Writes the badge SVG to disk.
 * @param svg - SVG markup.
 */
function writeBadge(svg) {
  fs.mkdirSync(path.dirname(BADGE_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(BADGE_OUTPUT_PATH, svg, 'utf8');
}

writeBadge(buildBadgeSvg(readCoveragePercentage()));
