export type HighlightTarget = {
  passageId: string;
  start: number;
  end: number;
};

const getTextNodes = (root: HTMLElement) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  return nodes;
};

export const getHighlightTarget = (range: Range, passage: HTMLElement): HighlightTarget | null => {
  const passageId = passage.dataset.passageId;

  if (!passageId) {
    return null;
  }

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(passage);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const selectedText = range.toString();
  const start = beforeRange.toString().length;
  const end = start + selectedText.length;

  if (start === end || !selectedText.trim()) {
    return null;
  }

  return { passageId, start, end };
};

export const applyHighlightTarget = (target: HighlightTarget, root: HTMLElement) => {
  const textNodes = getTextNodes(root);
  const range = document.createRange();
  let seen = 0;
  let started = false;
  let ended = false;

  for (const node of textNodes) {
    const nextSeen = seen + node.data.length;

    if (!started && target.start >= seen && target.start <= nextSeen) {
      range.setStart(node, target.start - seen);
      started = true;
    }

    if (!ended && target.end >= seen && target.end <= nextSeen) {
      range.setEnd(node, target.end - seen);
      ended = true;
      break;
    }

    seen = nextSeen;
  }

  if (!started || !ended || range.collapsed) {
    return false;
  }

  const span = document.createElement('span');
  span.className = 'ielts-highlighted';
  span.appendChild(range.extractContents());
  range.insertNode(span);

  return true;
};
