const DEFAULTS = { size: 19, lineHeight: 1.75, highlight: true, strength: 14 };
const $ = (id) => document.getElementById(id);

function render(s) {
  $("size").value = s.size;
  $("lineHeight").value = s.lineHeight;
  $("highlight").checked = s.highlight;
  $("strength").value = s.strength;
  $("strength").disabled = !s.highlight;
  $("sizeVal").textContent = s.size + "px";
  $("lhVal").textContent = Number(s.lineHeight).toFixed(2);
  $("strVal").textContent = s.strength + "%";
  $("sample").style.fontSize = s.size + "px";
  $("sample").style.lineHeight = s.lineHeight;
  $("sampleQ").style.background = s.highlight ? `rgba(255,255,255,${s.strength / 100})` : "transparent";
}

function save(patch) {
  chrome.storage.sync.get(DEFAULTS, (cur) => {
    const next = { ...cur, ...patch };
    chrome.storage.sync.set(next);
    render(next);
  });
}

chrome.storage.sync.get(DEFAULTS, render);

$("size").addEventListener("input", (e) => save({ size: Number(e.target.value) }));
$("lineHeight").addEventListener("input", (e) => save({ lineHeight: Number(e.target.value) }));
$("highlight").addEventListener("change", (e) => save({ highlight: e.target.checked }));
$("strength").addEventListener("input", (e) => save({ strength: Number(e.target.value) }));
$("reset").addEventListener("click", () => save({ ...DEFAULTS }));
