const MAX_NODES = 600;

// Scripts, external styles, fonts and form posts are all blocked in the preview.
const CSP =
  "default-src 'none'; img-src https: data:; media-src https: data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'";

function toModel(node, c) {
  if (c.n >= MAX_NODES) { c.truncated = true; return null; }
  if (node.nodeType === 1) {
    c.n++;
    const attrs = Array.from(node.attributes).map((a) => [a.name, a.value]);
    const children = [];
    node.childNodes.forEach((ch) => {
      const m = toModel(ch, c);
      if (m) children.push(m);
    });
    return { type: 'el', tag: node.tagName.toLowerCase(), attrs, children };
  }
  if (node.nodeType === 3) {
    const txt = node.textContent.replace(/\s+/g, ' ').trim();
    if (!txt) return null;
    c.n++;
    return { type: 'text', text: txt.length > 60 ? `${txt.slice(0, 60)}…` : txt };
  }
  if (node.nodeType === 8) {
    c.n++;
    return { type: 'comment', text: node.textContent.trim().slice(0, 60) };
  }
  return null;
}

/**
 * Parse the way a browser does. Returns the DOM as plain data (for the tree)
 * and a locked-down srcDoc string (for the preview iframe).
 */
export function parseHtml(code) {
  const doc = new DOMParser().parseFromString(code, 'text/html');
  const counter = { n: 0, truncated: false };
  const model = toModel(doc.documentElement, counter);

  const style = doc.createElement('style');
  style.textContent = 'body{font-family:system-ui,sans-serif;margin:12px;line-height:1.5}';
  const base = doc.createElement('base');
  base.setAttribute('target', '_blank'); // links go nowhere: the preview has no popups
  const meta = doc.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', CSP);
  doc.head.prepend(style);
  doc.head.prepend(base);
  doc.head.prepend(meta);

  return {
    model,
    srcDoc: `<!DOCTYPE html>${doc.documentElement.outerHTML}`,
    truncated: counter.truncated,
  };
}