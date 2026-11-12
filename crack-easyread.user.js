// ==UserScript==
// @name         크랙 크게 읽기
// @namespace    https://github.com/w7k4x9/crack-easyread
// @version      1.1.1
// @downloadURL  https://raw.githubusercontent.com/w7k4x9/crack-easyread/main/crack-easyread.user.js
// @updateURL    https://raw.githubusercontent.com/w7k4x9/crack-easyread/main/crack-easyread.user.js
// @description  크랙 채팅 글자 크기 키우기 + 따옴표 대사 반투명 강조. 다른 기능은 없습니다.
// @match        https://crack.wrtn.ai/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

// 페이지 구조(DOM)는 건드리지 않습니다. 글자 크기는 CSS로, 강조는 브라우저의
// 하이라이트 기능(CSS.highlights)으로 덧칠만 하기 때문에 크랙 메뉴/입력창에 영향이 없습니다.

(function () {
  "use strict";

  const DEFAULTS = { size: 19, lineHeight: 1.75, highlight: true, strength: 14 };
  const settings = {};
  for (const k in DEFAULTS) settings[k] = GM_getValue(k, DEFAULTS[k]);

  function save(patch) {
    Object.assign(settings, patch);
    for (const k in patch) GM_setValue(k, patch[k]);
    refresh();
  }

  // ---------- 글자 크기 ----------
  const style = document.createElement("style");
  style.id = "crack-easyread-style";
  document.head.appendChild(style);

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

  // ---------- 대사 강조 ----------
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

  function refresh() {
    applyCss();
    buildHighlights();
    renderPanel();
  }

  let timer = null;
  new MutationObserver((muts) => {
    // 설정 창 안에서 일어난 변화는 무시
    if (panel && muts.every((m) => panel.contains(m.target))) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      applyCss();
      buildHighlights();
    }, 250);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  // ---------- 설정 창 (Tampermonkey 메뉴 → "설정 열기") ----------
  let panel = null;

  function openPanel() {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    panel = document.createElement("div");
    panel.id = "crack-easyread-panel";
    panel.innerHTML = `
      <style>
        #crack-easyread-panel { position: fixed; top: 72px; right: 20px; z-index: 2147483000; width: 260px;
          padding: 16px; border-radius: 12px; background: #1b1b1b; color: #eee; border: 1px solid #3a3a3a;
          box-shadow: 0 8px 30px rgba(0,0,0,.5); font: 15px/1.4 Pretendard, "Malgun Gothic", system-ui, sans-serif; }
        #crack-easyread-panel * { box-sizing: border-box; }
        #crack-easyread-panel .hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-weight: 700; }
        #crack-easyread-panel .x { background: none; border: 0; color: #aaa; font-size: 20px; cursor: pointer; padding: 0 4px; }
        #crack-easyread-panel .row { margin-bottom: 14px; }
        #crack-easyread-panel .lb { display: flex; justify-content: space-between; margin-bottom: 6px; }
        #crack-easyread-panel .v { color: #ffb38a; font-weight: 600; }
        #crack-easyread-panel input[type=range] { width: 100%; accent-color: #ff6a3d; }
        #crack-easyread-panel .ck { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        #crack-easyread-panel .ck input { width: 18px; height: 18px; accent-color: #ff6a3d; }
        #crack-easyread-panel .rs { width: 100%; padding: 8px; border: 1px solid #444; border-radius: 6px;
          background: #262626; color: #ccc; cursor: pointer; font: inherit; }
      </style>
      <div class="hd"><span>크랙 크게 읽기</span><button class="x" data-k="close" title="닫기">×</button></div>
      <div class="row"><div class="lb"><span>글자 크기</span><span class="v" data-v="size"></span></div>
        <input type="range" data-k="size" min="14" max="30" step="1"></div>
      <div class="row"><div class="lb"><span>줄 간격</span><span class="v" data-v="lineHeight"></span></div>
        <input type="range" data-k="lineHeight" min="1.4" max="2.2" step="0.05"></div>
      <div class="row"><label class="ck"><input type="checkbox" data-k="highlight"> 대사 강조 켜기</label></div>
      <div class="row"><div class="lb"><span>강조 진하기</span><span class="v" data-v="strength"></span></div>
        <input type="range" data-k="strength" min="5" max="35" step="1"></div>
      <button class="rs" data-k="reset">기본값으로</button>
    `;
    panel.addEventListener("input", (e) => {
      const k = e.target.dataset.k;
      if (k === "size" || k === "lineHeight" || k === "strength") save({ [k]: Number(e.target.value) });
      if (k === "highlight") save({ highlight: e.target.checked });
    });
    panel.addEventListener("click", (e) => {
      const k = e.target.dataset.k;
      if (k === "close") openPanel();
      if (k === "reset") save({ ...DEFAULTS });
    });
    document.body.appendChild(panel);
    renderPanel();
  }

  function renderPanel() {
    if (!panel) return;
    const q = (s) => panel.querySelector(s);
    q('[data-k="size"]').value = settings.size;
    q('[data-k="lineHeight"]').value = settings.lineHeight;
    q('[data-k="highlight"]').checked = settings.highlight;
    q('[data-k="strength"]').value = settings.strength;
    q('[data-k="strength"]').disabled = !settings.highlight;
    q('[data-v="size"]').textContent = settings.size + "px";
    q('[data-v="lineHeight"]').textContent = Number(settings.lineHeight).toFixed(2);
    q('[data-v="strength"]').textContent = settings.strength + "%";
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel) openPanel();
  });

  GM_registerMenuCommand("설정 열기", openPanel);
  GM_registerMenuCommand("글자 크게 (+1)", () => save({ size: Math.min(30, settings.size + 1) }));
  GM_registerMenuCommand("글자 작게 (−1)", () => save({ size: Math.max(14, settings.size - 1) }));
  GM_registerMenuCommand("대사 강조 켜기/끄기", () => save({ highlight: !settings.highlight }));

  refresh();
})();
