import * as cheerio from 'cheerio';

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
  'icloud.com', 'me.com', 'live.com', 'msn.com',
]);

const FIELD_MAP = {
  firstName:       /^First Name:\s*(.+)/i,
  lastName:        /^Last Name:\s*(.+)/i,
  email:           /^Email:\s*(.+)/i,
  country:         /^Location \(Country\):\s*(.+)/i,
  teamSize:        /^Team Size:\s*([\d.]+)/i,
  game:            /^Game Name[:\s]*(.+)/i,
  storeUrl:        /^Steam or Mobile Store Page Link:\s*(.+)/i,
  wishlistCount:   /^Current Steam Wishlist Total.*?:\s*([\d.,]+)/i,
  pitchDeckUrl:    /^Pitch Deck Link:\s*(.+)/i,
  funding:         /^Do you require funding\?.*?:\s*(.+)/i,
  consoleInterest: /^Are you interested in Redhaven.*?:\s*(.+)/i,
  howHeard:        /^How did you hear about us\?:\s*(.+)/i,
  marketing:       /^I agree to receive marketing.*?:\s*(.+)/i,
};

const KNOWN_LABEL_STARTS = [
  'How did you hear about us',
  'I agree to receive marketing',
  'Are you interested in Redhaven',
  'Do you require funding',
];

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('store.steampowered.com') || url.includes('steampowered')) return 'Steam';
  if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) return 'iOS';
  if (url.includes('play.google.com')) return 'Android';
  if (url.includes('.itch.io') || url.includes('itch.io')) return 'itch.io';
  try { return 'Other: ' + new URL(url).hostname; } catch { return 'Other'; }
}

function deriveStudio(email, freeText, fullName) {
  const domain = email?.split('@')[1] || '';
  if (domain && !GENERIC_DOMAINS.has(domain)) {
    return domain.replace(/\.(com|io|gg|co|net|org|studio|games)$/i, '');
  }
  const studioMatch = freeText?.match(
    /([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)\s+(?:is|are)\s+(?:a|an)\s+(?:new\s+)?(?:small\s+)?(?:indie\s+)?(?:game\s+)?(?:dev|studio|team|software|games)/
  );
  if (studioMatch) return studioMatch[1];
  return fullName || '';
}

function parseFunding(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'n/a' || lower.includes('not required') || lower.startsWith('no')) return 'No';
  if (lower.includes('yes') || /\$[\d,]+/.test(raw)) return 'Yes';
  return raw.trim();
}

function parseWishlist(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[,.\s]/g, '');
  // Strip trailing zeros that came from "150.0" → "1500", catch by checking original
  const fromFloat = parseFloat(raw.replace(/,/g, ''));
  if (!isNaN(fromFloat)) return Math.round(fromFloat);
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function extractFreeText(lines, startLabel) {
  const startIdx = lines.findIndex(l => l.toLowerCase().startsWith(startLabel.toLowerCase()));
  if (startIdx === -1) return '';
  const contentAfterLabel = lines[startIdx].replace(/^[^:]+:\s*/i, '').trim();
  const collected = [contentAfterLabel];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const isKnown = KNOWN_LABEL_STARTS.some(label =>
      line.toLowerCase().startsWith(label.toLowerCase())
    );
    if (isKnown) break;
    collected.push(line);
  }
  return collected.join('\n').trim();
}

// Extract field:value pairs from Wix HTML email using cheerio
function extractFromHtml(html) {
  const $ = cheerio.load(html);
  const fields = {};

  // Wix emails render each field as a table row with two spans:
  // <span class="text">Label:</span> <span class="text light">Value</span>
  // Collect all bubble-text cells and extract label→value pairs
  const lines = [];

  $('.bubble-text').each((_, el) => {
    const spans = $(el).find('span');
    if (spans.length >= 2) {
      const label = $(spans[0]).text().trim();
      const value = $(spans[1]).text().trim();
      if (label && value) {
        lines.push(`${label} ${value}`);
      }
    } else {
      // Single span (e.g. section header "Notification Summary:")
      const text = $(el).text().trim();
      if (text) lines.push(text);
    }
  });

  return lines;
}

function parseLines(lines) {
  const fields = {};
  for (const [key, pattern] of Object.entries(FIELD_MAP)) {
    for (const line of lines) {
      const m = line.match(pattern);
      if (m) { fields[key] = m[1].trim(); break; }
    }
  }

  const freeText = extractFreeText(lines, 'Anything else we should know?');

  const firstName = fields.firstName || '';
  const lastName  = fields.lastName  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const email     = fields.email || '';
  const storeUrl  = fields.storeUrl?.trim() || null;
  const pitchDeckUrl = fields.pitchDeckUrl?.trim() || null;

  return {
    full_name:        fullName,
    studio:           deriveStudio(email, freeText, fullName),
    email,
    country:          fields.country  || null,
    team_size:        fields.teamSize ? parseInt(fields.teamSize, 10) : null,
    game:             fields.game     || null,
    store_url:        storeUrl,
    store_platform:   detectPlatform(storeUrl),
    wishlist_count:   parseWishlist(fields.wishlistCount),
    pitch_deck_url:   pitchDeckUrl,
    has_pitch_deck:   pitchDeckUrl ? 1 : 0,
    funding_required: parseFunding(fields.funding),
    console_interest: fields.consoleInterest?.toLowerCase().startsWith('yes') ? 1 : 0,
    how_they_heard:   fields.howHeard || null,
    free_text_notes:  freeText || null,
  };
}

// Auto-detect HTML vs plain text
export function parseWixEmail(rawBody) {
  const isHtml = rawBody.trimStart().startsWith('<') || rawBody.includes('<html');
  const lines = isHtml
    ? extractFromHtml(rawBody)
    : rawBody.split('\n').map(l => l.trim()).filter(Boolean);
  return parseLines(lines);
}

// Parse directly from structured HTML body (from Gmail MCP)
export function parseWixEmailFromHtml(htmlBody) {
  return parseLines(extractFromHtml(htmlBody));
}
