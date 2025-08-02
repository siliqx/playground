// js/app.js

// 你的試算表 ID 與 API Key
const SPREADSHEET_ID = '12U0LDIR_tndSjIyfZhlG9uIfB88yRqlaX--W7JHeOZ0';
const API_KEY        = 'AIzaSyBDO7EzRyaO3wbfzljo7vVlEDwabwSY9w0';
const RANGE          = "'詞彙'!A:E";

let entries = [];

/** 讀取 Google Sheets 資料，轉成物件陣列 */
async function loadEntries() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}` +
    `?key=${API_KEY}`;
  console.log('Fetching URL:', url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API 錯誤：${res.status}`);
  const json = await res.json();
  const [headers, ...rows] = json.values;
  entries = rows.map(r =>
    Object.fromEntries(headers.map((h, i) => [h.trim(), r[i] || '']))
  );
}

/** 動詞變化規則 */
const verbRules = {
  'VRB': {
    '主事焦點': root => root,
    '受事焦點': root => `${root}-en`,
    '處所焦點': root => `${root}-un`,
    '工具／受惠焦點': root => `Si-${root}`,
    '祈使式主焦': root => root,
    '祈使式受焦': root => `${root}-i`,
    '祈使式處焦': root => `${root}-i`,
    '祈使式周焦': root => `${root}-ani`,
    '未來式': root => `'am ${root}`,
    '進行式': root => ` CVC-${root}`,
    '過去式': root => `${root} ila`,
    '否定一般式': root => `okay ${root}`,
    '否定祈使式': root => `okik ${root}`,
  },
  // 如需更多類別，可在這裡繼續擴充
};

/** 根據詞根 root 與 POS 類別，產生一份變化表 */
function generateConjugation(root, pos) {
  // 找到對應的 rule set (支援 VRB 或以「動詞」開頭的 POS)
  let ruleSet = verbRules[pos] || verbRules['VRB'];
  if (!pos.includes('動詞') && !verbRules[pos]) {
    return [];
  }
  return Object.entries(ruleSet).map(([label, fn]) => [label, fn(root)]);
}

/** 搜尋函式 */
function searchEntries(q) {
  const kw = q.trim().toLowerCase();
  if (!kw) return entries;
  return entries.filter(e =>
    (e['ZH-TW']  || '').toLowerCase().includes(kw) ||
    (e['Saisiyat']|| '').toLowerCase().includes(kw) ||
    (e['ENG']    || '').toLowerCase().includes(kw) ||
    (e['POS']    || '').toLowerCase().includes(kw)
  );
}

/** 渲染候選列表 */
function renderList(list) {
  const ul = document.getElementById('resultList');
  ul.innerHTML = '';
  list.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item['Saisiyat']} — ${item['ZH-TW']}`;
    li.onclick = () => showDetail(item);
    ul.appendChild(li);
  });
}

/** 顯示完整詞條細節，並處理動詞變化表 */
function showDetail(item) {
  // 基本欄位填值
  document.getElementById('termAtayal').textContent  = item['Saisiyat'];
  document.getElementById('termZh').textContent      = item['ZH-TW'];
  document.getElementById('termENG').textContent     = item['ENG'];
  document.getElementById('termPos').textContent     = item['POS'] || '';
  document.getElementById('termDef').textContent     = item['definition'] || '';
  document.getElementById('termExample').textContent = item['example'] || '';

  const audioEl = document.getElementById('termAudio');
  if (item['audio_url']) {
    audioEl.src = item['audio_url'];
    audioEl.style.display = 'block';
  } else {
    audioEl.src = '';
    audioEl.style.display = 'none';
  }

  // 動詞變化表邏輯
  const conjSec   = document.getElementById('conjugationSection');
  const conjTbody = document.querySelector('#conjugationTable tbody');
  // 先清空並隱藏
  conjTbody.innerHTML = '';
  conjSec.classList.add('hidden');

  const posVal = (item['POS'] || '').trim();
  // 判斷：只要 POS 含「動詞」或直接是 VRB，就認為可產生變化
  if (posVal.includes('動詞') || posVal === 'VRB') {
    const rows = generateConjugation(item['Saisiyat'], posVal);
    if (rows.length) {
      rows.forEach(([form, example]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${form}</td><td>${example}</td>`;
        conjTbody.appendChild(tr);
      });
      conjSec.classList.remove('hidden');
    }
  }

  // 顯示 Modal
  document.getElementById('detailModal').classList.add('show');
}

/** 隱藏 Modal */
document.getElementById('closeBtn').onclick = () => {
  document.getElementById('detailModal').classList.remove('show');
};

/** 啟動並綁定事件 */
async function init() {
  try {
    await loadEntries();
    renderList(entries);
    document.getElementById('searchBox')
      .addEventListener('input', e => renderList(searchEntries(e.target.value)));
  } catch (e) {
    alert('資料載入失敗，詳見 Console');
    console.error(e);
  }
}

window.addEventListener('DOMContentLoaded', init);
