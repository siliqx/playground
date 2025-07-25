// js/app.js

// 你的試算表 ID 與 API Key
const SPREADSHEET_ID = '1cZGiiy6YEs9kmSLQ8u_jaode3dWWAs9AdQHZon_leSs';
const API_KEY        = 'AIzaSyBDO7EzRyaO3wbfzljo7vVlEDwabwSY9w0';
// 注意：如果你的分頁名稱是「詞彙」，且含中文，Range 要加單引號包起來
const RANGE          = "'詞彙'!A:E";

let entries = [];

/**
 * 讀取 Google Sheets 資料，轉成物件陣列
 */
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

/**
 * 動詞變化規則
 */
const verbRules = {
  'VRB': {
    '主事焦點': root => root,
    '受事焦點': root => `${root}-un`,
    '處所焦點': root => `${root}-un`,
    '工具／受惠焦點': root => `s-${root}`,
    '祈使式主焦': root => `${root}`,
    '祈使式受焦': root => `${root}-i`,
    '祈使式處焦': root => `${root}-i`,
    '祈使式周焦': root => `${root}-ani`,
    '規勸式主焦': root => `m-${root}-a`,
    '規勸式受焦': root => `${root}-aw`,
    '規勸式處焦': root => `${root}-ay`,
    '規勸式周焦': root => `${root}-anay`,
    '未來式': root => `p-${root}`,
    '進行式1': root => `cyux ${root}`,
    '進行式2': root => `nyux ${root}`,
    '否定一般式': root => `ini ${root}`,
    '否定祈使式': root => `laxi ${root}`,
  },
  // 如需更多類別，可在這裡繼續擴充
};

/**
 * 根據詞根 root 與 POS 類別，產生一份變化表（array of [形式, 詞形]）
 */
function generateConjugation(root, pos) {
  let ruleSet = null;
  for (const key of Object.keys(verbRules)) {
    if (pos.startsWith(key)) {
      ruleSet = verbRules[key];
      break;
    }
  }
  if (!ruleSet) return [];
  return Object.entries(ruleSet).map(([label, fn]) => [label, fn(root)]);
}

/**
 * 搜尋函式：同時比對 ZH-TW 與 Atayal 兩欄
 */
function searchEntries(q) {
  const kw = q.trim().toLowerCase();
  if (!kw) return entries;
  return entries.filter(e =>
    e['ZH-TW'].toLowerCase().includes(kw) ||
    e['Atayal'].toLowerCase().includes(kw)
  );
}

/**
 * 渲染候選列表
 */
function renderList(list) {
  const ul = document.getElementById('resultList');
  ul.innerHTML = '';
  list.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item['Atayal']} — ${item['ZH-TW']}`;
    li.onclick = () => showDetail(item);
    ul.appendChild(li);
  });
}

/**
 * 顯示完整詞條細節，並處理動詞變化表的顯示
 */
function showDetail(item) {
  // 基本欄位
  document.getElementById('termAtayal').textContent  = item['Atayal'];
  document.getElementById('termZh').textContent      = item['ZH-TW'];
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

  // 動詞變化表
  const conjSec   = document.getElementById('conjugationSection');
  const conjTbody = document.getElementById('conjugationTable').querySelector('tbody');
  conjTbody.innerHTML = '';  // 清空舊內容

  if (item.POS && item.POS.startsWith('VRB')) {
    // 顯示區塊
    conjSec.classList.remove('hidden');
    // 產生變化行
    const rows = generateConjugation(item['Atayal'], item.POS);
    rows.forEach(([form, example]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${form}</td><td>${example}</td>`;
      conjTbody.appendChild(tr);
    });
  } else {
    // 隱藏區塊
    conjSec.classList.add('hidden');
  }

  // 顯示 Modal
  document.getElementById('detailModal').classList.add('show');
}

/**
 * 隱藏 Modal
 */
document.getElementById('closeBtn').onclick = () => {
  document.getElementById('detailModal').classList.remove('show');
};

/**
 * 啟動並綁定事件
 */
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
