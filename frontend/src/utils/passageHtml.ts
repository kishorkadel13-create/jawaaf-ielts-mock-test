const BLOCK_SELECTOR = 'p, div, li, blockquote';
const SENTENCE_END_RE = /[.!?:;"')\]]$/;
const WORD_FRAGMENT_RE = /[A-Za-z]{1,4}$/;

const collapseTextNodes = (root: HTMLElement) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  nodes.forEach((node) => {
    node.nodeValue = node.nodeValue?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ') ?? '';
  });
};

const canMergeSoftLine = (current: Element, next: Element) => {
  const currentText = current.textContent?.trim() ?? '';
  const nextText = next.textContent?.trim() ?? '';

  if (!currentText || !nextText || !/^[a-z]/.test(nextText)) {
    return false;
  }

  return !SENTENCE_END_RE.test(currentText) || WORD_FRAGMENT_RE.test(currentText);
};

const mergeSoftLineBlocks = (root: HTMLElement) => {
  const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR));

  blocks.forEach((block) => {
    let next = block.nextElementSibling;

    while (next && next.tagName === block.tagName && canMergeSoftLine(block, next)) {
      const currentText = block.textContent?.trimEnd() ?? '';
      const nextText = next.textContent?.trimStart() ?? '';
      const joiner = currentText.endsWith('-') || WORD_FRAGMENT_RE.test(currentText) ? '' : ' ';

      block.textContent = `${currentText.replace(/-$/, '')}${joiner}${nextText}`;
      const merged = next;
      next = next.nextElementSibling;
      merged.remove();
    }
  });
};

export const normalizePassageHtml = (html?: string) => {
  if (!html?.trim()) {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  const normalizedBreaks = html
    .replace(/([A-Za-z])-?\s*(?:<br\s*\/?>|\r?\n)+\s*([a-z])/gi, '$1$2')
    .replace(/(?:<br\s*\/?>|\r?\n)+/gi, ' ');

  const doc = new DOMParser().parseFromString(normalizedBreaks, 'text/html');
  const root = doc.body;

  root.querySelectorAll('pre').forEach((pre) => {
    const paragraph = doc.createElement('p');
    paragraph.innerHTML = pre.innerHTML;
    pre.replaceWith(paragraph);
  });

  collapseTextNodes(root);
  mergeSoftLineBlocks(root);

  return root.innerHTML.trim();
};
