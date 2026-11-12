// 크랙 크게 읽기 — 글자 크기 + 따옴표 대사 반투명 강조, 이 두 가지만 합니다.
// 페이지 구조(DOM)는 건드리지 않습니다. 글자 크기는 CSS로, 강조는 브라우저의
// 하이라이트 기능(CSS.highlights)으로 덧칠만 하기 때문에 크랙 메뉴/입력창에 영향이 없습니다.

const DEFAULTS = { size: 19, lineHeight: 1.75, highlight: true, strength: 14 };
let settings = { ...DEFAULTS };

const style = document.createElement("style");
style.id = "crack-easyread-style";
document.documentElement.appendChild(style);

function isDarkPage() {
  const bg = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
  if (!bg) return true;
  const [r, g, b] = bg.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function applyCss() {
  const a = settings.strength / 100;
  const tint = isDarkPage() ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 0.8})`;
  style.textContent = `
    .wrtn-markdown,
    .wrtn-markdown p, .wrtn-markdown li, .wrtn-markdown span,
    .wrtn-markdown em, .wrtn-markdown strong, .wrtn-markdown blockquote {
      font-size: ${settings.size}px !important;
      line-height: ${settings.lineHeight} !important;
    }
    ::highlight(crack-easyread-quote) { background-color: ${tint}; }
  `;
}

// "..." 와 “...” 대사를 찾습니다. 굵게/기울임 등으로 텍스트가 쪼개져 있어도 이어서 찾습니다.
const QUOTE_RE = /"[^"\n]+"|“[^”\n]+”/g;

function buildHighlights() {
  if (!window.CSS || !CSS.highlights) return;
  if (!settings.highlight) {
    CSS.highlights.delete("crack-easyread-quote");
    return;
  }
  const hl = new Highlight();
  document.querySelectorAll(".wrtn-markdown p, .wrtn-markdown li").forEach((block) => {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text = "";
    let n;
    while ((n = walker.nextNode())) {
      nodes.push([n, text.length]);
      text += n.nodeValue;
    }
    if (!/["“]/.test(text)) return;
    const locate = (i) => {
      for (let k = nodes.length - 1; k >= 0; k--) {
        if (nodes[k][1] <= i) return [nodes[k][0], i - nodes[k][1]];
      }
    };
    QUOTE_RE.lastIndex = 0;
    let m;
    while ((m = QUOTE_RE.exec(text))) {
      const start = locate(m.index);
      const end = locate(m.index + m[0].length - 1);
      const r = new Range();
      r.setStart(start[0], start[1]);
      r.setEnd(end[0], end[1] + 1);
      hl.add(r);
    }
  });
  CSS.highlights.set("crack-easyread-quote", hl);
}

let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    applyCss();
    buildHighlights();
  }, 250);
}

chrome.storage.sync.get(DEFAULTS, (saved) => {
  settings = { ...DEFAULTS, ...saved };
  applyCss();
  buildHighlights();
  // 새 답변이 올라오거나 스크롤로 예전 대화가 불러와질 때 다시 칠합니다.
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
});

chrome.storage.onChanged.addListener((changes) => {
  for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
  applyCss();
  buildHighlights();
});
