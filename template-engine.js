export function renderTemplate(template, data) {
  let out = template;

  // Variable substitution: [FIRST_NAME], [GAME], etc.
  for (const [key, val] of Object.entries(data)) {
    out = out.replaceAll(`[${key.toUpperCase()}]`, val ?? '');
  }

  // Conditional blocks: [IF FIELD:] ... [/IF]
  out = out.replace(/\[IF ([A-Z_]+):\]([\s\S]*?)\[\/IF\]/g, (_, field, content) => {
    return data[field.toLowerCase()] ? content : '';
  });

  // Inline conditional: [IF FIELD: text] (no closing tag variant)
  out = out.replace(/\[IF ([A-Z_]+): ([^\]]+)\]/g, (_, field, content) => {
    return data[field.toLowerCase()] ? content : '';
  });

  // Clean up triple+ blank lines left by removed conditionals
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

export function buildInboundDraft(inbound, templateBody, settings) {
  const data = {
    first_name:       inbound.full_name?.split(' ')[0] || '',
    game:             inbound.game || '',
    store_url:        inbound.store_url || '',
    store_platform:   inbound.store_platform || '',
    pitch_deck_url:   inbound.pitch_deck_url || '',
    wishlist_count:   inbound.wishlist_count?.toLocaleString() || '',
    console_interest: inbound.console_interest ? 'yes' : '',
    credit_link_url:  settings.credit_link_url || '',
    rep_name:         settings.rep_name || '',
  };
  return renderTemplate(templateBody, data);
}

export function buildPublicReplyDraft(signal, templateBody, settings) {
  const data = {
    username:      signal.author || '',
    source_detail: signal.source_detail || '',
    game:          '',
    tool_mention:  'Localization, forecasting, and upscaling',
    rep_name:      settings.rep_name || '',
  };
  return renderTemplate(templateBody, data);
}

export function buildDmDraft(signal, templateBody, settings) {
  const data = {
    username:      signal.author || '',
    source_detail: signal.source_detail || '',
    game:          '',
    rep_name:      settings.rep_name || '',
  };
  return renderTemplate(templateBody, data);
}
