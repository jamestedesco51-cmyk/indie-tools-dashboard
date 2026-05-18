const HOT_PATTERNS = [
  /looking for (a )?publisher/i,
  /need (a )?publisher/i,
  /publishing deal/i,
  /pub deal/i,
  /publisher.{0,30}localization/i,
  /localization.{0,30}publisher/i,
];

const WARM_PATTERNS = [
  /indie publisher/i,
  /upscal(e|ing)/i,
  /scale up.{0,20}(game|launch|marketing)/i,
  /revenue forecast/i,
  /launch forecast/i,
  /next fest.{0,40}publisher/i,
  /solo dev.{0,40}(support|bandwidth|help)/i,
  /wishlist.{0,30}\d{4,}/i,
  /localization/i,
];

export function keywordMatcher(text) {
  if (!text) return { hit: false, heat: 'cold', keywords: [] };

  const matched = [];
  let heat = 'cold';

  for (const pattern of HOT_PATTERNS) {
    if (pattern.test(text)) {
      matched.push(pattern.source);
      heat = 'hot';
    }
  }

  if (heat !== 'hot') {
    for (const pattern of WARM_PATTERNS) {
      if (pattern.test(text)) {
        matched.push(pattern.source);
        heat = 'warm';
      }
    }
  }

  return {
    hit: matched.length > 0,
    heat,
    keywords: matched,
  };
}
