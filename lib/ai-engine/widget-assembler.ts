import type { WidgetPlacement } from './widget-placer';

/**
 * Widget Assembler — inserts widget `<div data-widget="...">` markers
 * into generated article HTML at the positions determined by WidgetPlacer.
 *
 * The WidgetHydrator on the frontend reads these markers and renders
 * interactive React components in their place.
 */

export interface AssemblyResult {
  html: string;
  widgets_inserted: number;
  assembly_log: string[];
}

export function assembleWidgets(
  contentHtml: string,
  placements: WidgetPlacement[]
): AssemblyResult {
  const log: string[] = [];

  // Split HTML into paragraphs
  const paragraphs = splitIntoParagraphs(contentHtml);
  log.push(`Found ${paragraphs.length} paragraphs in article HTML`);

  if (paragraphs.length === 0) {
    log.push('WARNING: No paragraphs found — returning original HTML');
    return { html: contentHtml, widgets_inserted: 0, assembly_log: log };
  }

  // Group placements by position
  const byPosition = new Map<string, WidgetPlacement[]>();
  for (const p of placements) {
    const existing = byPosition.get(p.position) || [];
    existing.push(p);
    byPosition.set(p.position, existing);
  }

  // Build output by inserting widgets at correct positions
  const output: string[] = [];
  let widgetsInserted = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const isTldr = para.toLowerCase().includes('tldr') || para.toLowerCase().includes('tl;dr');

    // Insert "before_tldr" widgets before TLDR paragraph
    if (isTldr) {
      const beforeTldr = byPosition.get('before_tldr') || [];
      for (const placement of beforeTldr) {
        const widgetHtml = buildWidgetDiv(placement);
        output.push(widgetHtml);
        widgetsInserted++;
        log.push(`Inserted ${placement.widget_type} before TLDR (paragraph ${i + 1})`);
      }
      byPosition.delete('before_tldr');
    }

    output.push(para);

    // Insert "after_pN" widgets after the Nth paragraph
    const posKey = `after_p${i + 1}`;
    const afterP = byPosition.get(posKey) || [];
    for (const placement of afterP) {
      const widgetHtml = buildWidgetDiv(placement);
      output.push(widgetHtml);
      widgetsInserted++;
      log.push(`Inserted ${placement.widget_type} after paragraph ${i + 1}`);
    }
    byPosition.delete(posKey);
  }

  // Insert "end" widgets at the very end
  const endWidgets = byPosition.get('end') || [];
  for (const placement of endWidgets) {
    const widgetHtml = buildWidgetDiv(placement);
    output.push(widgetHtml);
    widgetsInserted++;
    log.push(`Inserted ${placement.widget_type} at end`);
  }
  byPosition.delete('end');

  // Insert any remaining "before_tldr" or "after_pN" widgets that couldn't
  // be placed (article shorter than expected) — append at end
  for (const [pos, remaining] of Array.from(byPosition.entries())) {
    for (const placement of remaining) {
      const widgetHtml = buildWidgetDiv(placement);
      output.push(widgetHtml);
      widgetsInserted++;
      log.push(`Inserted ${placement.widget_type} at end (overflow from ${pos} — article too short)`);
    }
  }

  log.push(`Total widgets inserted: ${widgetsInserted}`);

  return {
    html: output.join('\n'),
    widgets_inserted: widgetsInserted,
    assembly_log: log,
  };
}

/**
 * Build a widget div marker from a placement.
 * Format: <div data-widget="type" data-props='JSON'>...</div>
 */
function buildWidgetDiv(placement: WidgetPlacement): string {
  const propsJson = JSON.stringify(placement.data);
  // Escape single quotes in JSON for safe HTML attribute
  const escaped = propsJson.replace(/'/g, '&#39;');
  return `<div data-widget="${placement.widget_type}" data-props='${escaped}'></div>`;
}

/**
 * Split HTML content into paragraph-level blocks.
 * Handles <p>, <h2>, <ul>, and standalone text.
 */
function splitIntoParagraphs(html: string): string[] {
  const blocks: string[] = [];
  // Match block-level elements
  const blockRegex = /<(p|h[1-6]|ul|ol|div)[^>]*>[\s\S]*?<\/\1>/gi;
  let match;
  let lastIndex = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    // Capture any text between blocks
    if (match.index > lastIndex) {
      const between = html.slice(lastIndex, match.index).trim();
      if (between) blocks.push(between);
    }
    blocks.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Capture trailing text
  if (lastIndex < html.length) {
    const trailing = html.slice(lastIndex).trim();
    if (trailing) blocks.push(trailing);
  }

  return blocks.filter(b => b.length > 0);
}
