const ALLOWED_SVG_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc'
]);

const ALLOWED_SVG_ATTRS = new Set([
  'viewbox', 'width', 'height', 'xmlns', 'class',
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity',
  'opacity', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points',
  'transform', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform',
  'id', 'preserveaspectratio'
]);

const CANONICAL_SVG_ATTR = {
  viewbox: 'viewBox',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  preserveaspectratio: 'preserveAspectRatio'
};

const CANONICAL_SVG_TAG = {
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient'
};

export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function isSafeAttrValue(attrLower, rawVal) {
  if (!ALLOWED_SVG_ATTRS.has(attrLower)) return false;
  if (attrLower.startsWith('on')) return false;

  const val = String(rawVal ?? '').trim();
  // Strip ASCII control chars & whitespace when checking URI schemes
  const compact = val.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  if (
    compact.includes('javascript:') ||
    compact.includes('vbscript:') ||
    compact.includes('data:') ||
    compact.includes('expression(')
  ) {
    return false;
  }

  if (compact.includes('url(')) {
    // Allow internal gradient/def references only, e.g. url(#grad1)
    const urlMatches = compact.match(/url\([^)]*\)/g) || [];
    for (const m of urlMatches) {
      if (!/^url\(["']?#[a-zA-Z0-9_-]+["']?\)$/.test(m)) {
        return false;
      }
    }
  }

  return true;
}

function sanitizeSVGViaDOMParser(trimmed) {
  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
  if (!doc || doc.querySelector('parsererror')) return '';
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') return '';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const outDoc = document.implementation
    ? document.implementation.createDocument(SVG_NS, 'svg', null)
    : null;

  function buildCleanElement(srcEl, targetEl) {
    const cleanEl = targetEl || document.createElementNS(SVG_NS, CANONICAL_SVG_TAG[srcEl.tagName.toLowerCase()] || srcEl.tagName.toLowerCase());

    for (const attr of Array.from(srcEl.attributes || [])) {
      const nameLower = attr.name.toLowerCase();
      if (!isSafeAttrValue(nameLower, attr.value)) continue;
      const outName = CANONICAL_SVG_ATTR[nameLower] || nameLower;
      cleanEl.setAttribute(outName, attr.value);
    }

    if (cleanEl.tagName.toLowerCase() === 'svg' && !cleanEl.getAttribute('xmlns')) {
      cleanEl.setAttribute('xmlns', SVG_NS);
    }

    for (const child of Array.from(srcEl.childNodes || [])) {
      if (child.nodeType === 1) { // ELEMENT_NODE
        const childTag = child.tagName.toLowerCase();
        if (!ALLOWED_SVG_TAGS.has(childTag)) continue;
        cleanEl.appendChild(buildCleanElement(child));
      } else if (child.nodeType === 3) { // TEXT_NODE
        const parentTag = srcEl.tagName.toLowerCase();
        if (parentTag === 'title' || parentTag === 'desc') {
          cleanEl.appendChild((outDoc || document).createTextNode(child.textContent || ''));
        }
      }
    }
    return cleanEl;
  }

  const cleanRoot = buildCleanElement(root, outDoc ? outDoc.documentElement : null);
  return new XMLSerializer().serializeToString(cleanRoot);
}

function parseAttributesFromTagBody(attrText) {
  const attrs = [];
  const attrRe = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(attrText)) !== null) {
    const rawName = match[1];
    const rawVal = match[2] ?? match[3] ?? match[4] ?? '';
    const nameLower = rawName.toLowerCase();
    if (!isSafeAttrValue(nameLower, rawVal)) continue;
    const outName = CANONICAL_SVG_ATTR[nameLower] || nameLower;
    attrs.push(`${outName}="${escapeHTML(rawVal)}"`);
  }
  return attrs;
}

function sanitizeSVGStringFallback(trimmed) {
  // Strip comments, PI, doctypes
  const cleaned = trimmed
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim();

  if (!/^<svg(?=[\s>])/i.test(cleaned)) return '';

  const tokenRe = /<\/?([a-zA-Z][a-zA-Z0-9:_-]*)([^>]*)>|([^<]+)/g;
  const openAllowedStack = [];
  const disallowedStack = [];
  let output = '';
  let seenRootSvg = false;
  let rootClosed = false;

  let m;
  while ((m = tokenRe.exec(cleaned)) !== null) {
    const full = m[0];
    const rawTag = m[1];
    const attrPart = m[2] || '';
    const textChunk = m[3];

    if (textChunk !== undefined) {
      if (disallowedStack.length === 0 && openAllowedStack.length > 0) {
        const top = openAllowedStack[openAllowedStack.length - 1];
        if (top === 'title' || top === 'desc') {
          output += escapeHTML(textChunk);
        }
      }
      continue;
    }

    const isClosing = full.startsWith('</');
    const isSelfClosing = !isClosing && /\/\s*$/.test(attrPart);
    const tagLower = rawTag.toLowerCase();

    if (!seenRootSvg) {
      if (isClosing || tagLower !== 'svg') return '';
      seenRootSvg = true;
    } else if (rootClosed) {
      break;
    }

    if (isClosing) {
      if (disallowedStack.length > 0) {
        if (disallowedStack[disallowedStack.length - 1] === tagLower) {
          disallowedStack.pop();
        }
        continue;
      }
      if (openAllowedStack.length > 0 && openAllowedStack[openAllowedStack.length - 1] === tagLower) {
        openAllowedStack.pop();
        const outTag = CANONICAL_SVG_TAG[tagLower] || tagLower;
        output += `</${outTag}>`;
        if (tagLower === 'svg' && openAllowedStack.length === 0) {
          rootClosed = true;
        }
      }
      continue;
    }

    // Opening tag
    if (disallowedStack.length > 0 || !ALLOWED_SVG_TAGS.has(tagLower)) {
      if (!isSelfClosing) {
        disallowedStack.push(tagLower);
      }
      continue;
    }

    const rawAttrs = isSelfClosing ? attrPart.replace(/\/\s*$/, '') : attrPart;
    const safeAttrs = parseAttributesFromTagBody(rawAttrs);
    if (tagLower === 'svg' && !safeAttrs.some(a => a.startsWith('xmlns='))) {
      safeAttrs.push('xmlns="http://www.w3.org/2000/svg"');
    }
    const outTag = CANONICAL_SVG_TAG[tagLower] || tagLower;
    const attrStr = safeAttrs.length ? ` ${safeAttrs.join(' ')}` : '';
    output += `<${outTag}${attrStr}${isSelfClosing ? '/>' : '>'}`;
    if (!isSelfClosing) {
      openAllowedStack.push(tagLower);
    } else if (tagLower === 'svg' && openAllowedStack.length === 0) {
      rootClosed = true;
    }
  }

  // Close any unclosed allowed tags
  while (openAllowedStack.length > 0) {
    const t = openAllowedStack.pop();
    const outTag = CANONICAL_SVG_TAG[t] || t;
    output += `</${outTag}>`;
  }

  return /^<svg[\s>][\s\S]*<\/svg>$/i.test(output) ? output : '';
}

export function sanitizeSVG(rawSvg) {
  const trimmed = String(rawSvg ?? '').trim();
  if (!/^<svg(?=[\s>])/i.test(trimmed)) return '';

  if (typeof DOMParser !== 'undefined' && typeof document !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    const parsed = sanitizeSVGViaDOMParser(trimmed);
    if (parsed) return parsed;
    return '';
  }

  return sanitizeSVGStringFallback(trimmed);
}

export function sanitizeCustomImage(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { ok: false, value: '' };

  if (/^<svg(?=[\s>])/i.test(trimmed)) {
    const cleanSvg = sanitizeSVG(trimmed);
    if (cleanSvg) {
      return { ok: true, value: cleanSvg, isSvg: true };
    }
    return { ok: false, value: '' };
  }

  if (/[<>]/.test(trimmed)) {
    return { ok: false, value: '' };
  }

  return { ok: true, value: trimmed, isSvg: false };
}

export function renderVisualHTML(image, { trusted = false } = {}) {
  const str = String(image ?? '').trim();
  if (trusted) return str;

  if (/^<svg(?=[\s>])/i.test(str)) {
    return sanitizeSVG(str) || escapeHTML(str);
  }
  return escapeHTML(str);
}

export function setSanitizedHTML(el, html, config) {
  if (!el) return;
  if (typeof Element !== 'undefined' && 'setHTML' in Element.prototype && typeof el.setHTML === 'function') {
    el.setHTML(html, config ? { sanitizer: config } : undefined);
  } else {
    el.innerHTML = html;
  }
}
