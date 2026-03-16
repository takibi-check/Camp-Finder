'use strict';

// ===== 地図初期化 =====
const map = L.map('map', {
  center: [36.5, 138.0],
  zoom: 6,
  zoomControl: true,
});

// タイルレイヤー（CartoDB Positron - クリーンで高品質）
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

// ===== 状態管理 =====
let markers = [];
let allCamps = [];
let userMarker = null;
let userLatLng = null;

// ===== カスタムアイコン =====
function createCampIcon(reviews) {
  let color = '#2d6a4f';
  if (reviews === 0)      color = '#e76f51';
  else if (reviews <= 3)  color = '#f4a261';
  else if (reviews <= 7)  color = '#40916c';
  else                    color = '#74c69d';

  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px; height:34px;
      background:${color};
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex; align-items:center; justify-content:center;
    "><span style="transform:rotate(45deg); font-size:15px;">⛺</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px; height:18px;
      background:#3b82f6;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(59,130,246,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// ===== GPS位置情報取得 =====
function locateUser() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (userMarker) userMarker.remove();
      userMarker = L.marker(userLatLng, { icon: createUserIcon(), zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>現在地</b>');
      map.setView(userLatLng, 8);
    },
    () => {
      // 位置情報取得失敗時は初期表示のまま
    }
  );
}

// ===== 距離計算（km）=====
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ===== 星表示 =====
function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ===== ポップアップHTML =====
function buildPopup(c, openPeriod) {
  const currentYear = new Date().getFullYear();
  const openYear = c.open_year;
  const yearsAgo = openYear ? currentYear - openYear : null;
  const isNew = openPeriod > 0 && yearsAgo !== null ? yearsAgo <= openPeriod : false;
  const distText = userLatLng
    ? `${calcDistance(userLatLng.lat, userLatLng.lng, c.lat, c.lng)} km`
    : '—';
  const newBadge = isNew ? '<span class="popup-new-badge">NEW</span>' : '';
  const openText = openYear
    ? `${openYear}年（${yearsAgo === 0 ? '今年' : yearsAgo + '年前'}）`
    : '情報なし';
  const napLink = c.nap_url
    ? `<a href="${c.nap_url}" target="_blank" rel="noopener" class="popup-link" style="background:#2d6a4f">📋 なっぷで見る</a>`
    : '';

  return `
    <div class="popup-inner">
      <div class="popup-name">${c.name}${newBadge}</div>
      <div class="popup-meta">
        <div class="popup-row">
          <span class="popup-label">都道府県</span>
          <span>${c.prefecture}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">口コミ数</span>
          <span>${c.review_count} 件</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">評価</span>
          <span class="popup-stars">${renderStars(c.rating)}</span>
          <span>${c.rating}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">開設年</span>
          <span>${openText}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">現在地から</span>
          <span>${distText}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0">
      <a href="${c.gmaps_url}" target="_blank" rel="noopener" class="popup-link">📍 Googleマップで開く</a>
      ${napLink}
    </div>
  `;
}

// ===== カードHTML =====
function buildCard(c, index, openPeriod) {
  const currentYear = new Date().getFullYear();
  const openYear = c.open_year;
  const yearsAgo = openYear ? currentYear - openYear : null;
  const isNew = openPeriod > 0 && yearsAgo !== null ? yearsAgo <= openPeriod : false;
  const distText = userLatLng
    ? `${calcDistance(userLatLng.lat, userLatLng.lng, c.lat, c.lng)} km`
    : null;

  const newBadge = isNew
    ? `<span class="meta-badge new">🆕 ${openYear}年開設（${yearsAgo === 0 ? '今年' : yearsAgo + '年前'}）</span>` : '';
  const distBadge = distText
    ? `<span class="meta-badge">📍 ${distText}</span>` : '';

  return `
    <div class="camp-card" onclick="focusMarker(${index})">
      <div class="camp-card-icon">⛺</div>
      <div class="camp-card-body">
        <div class="camp-card-name">${c.name}</div>
        <div class="camp-card-desc">${c.address || ''}</div>
        <div class="camp-card-meta">
          <span class="meta-badge">📍 ${c.prefecture}</span>
          <span class="meta-badge">💬 口コミ ${c.review_count} 件</span>
          <span class="meta-badge accent">⭐ ${c.rating}</span>
          ${newBadge}
          ${distBadge}
        </div>
      </div>
      <div class="camp-card-link">
        <a href="${c.gmaps_url}" target="_blank" rel="noopener" class="btn-map" onclick="event.stopPropagation()">
          地図を開く
        </a>
      </div>
    </div>
  `;
}

// ===== マーカーにフォーカス =====
window.focusMarker = function(index) {
  const m = markers[index];
  if (!m) return;
  map.setView(m.getLatLng(), 12, { animate: true });
  m.openPopup();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== 検索メイン =====
window.searchCamp = async function() {
  const btn = document.getElementById('searchBtn');
  btn.textContent = '検索中…';
  btn.disabled = true;

  try {
    if (allCamps.length === 0) {
      const res = await fetch('camps.json');
      allCamps = await res.json();
    }

    const pref        = document.getElementById('pref').value;
    const reviewMax   = Number(document.getElementById('review').value);
    const sort        = document.getElementById('sort').value;
    const openPeriod  = Number(document.getElementById('openPeriod').value);
    const currentYear = new Date().getFullYear();

    let filtered = allCamps.filter(c => {
      if (pref && c.prefecture !== pref) return false;
      if (c.review_count > reviewMax) return false;
      if (openPeriod > 0 && c.open_year && (currentYear - c.open_year) > openPeriod) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sort === 'asc')    return a.review_count - b.review_count;
      if (sort === 'desc')   return b.review_count - a.review_count;
      if (sort === 'rating') return b.rating - a.rating;
      return 0;
    });

    // マーカー削除
    markers.forEach(m => m.remove());
    markers = [];

    // 結果バー
    const resultBar = document.getElementById('resultBar');
    const resultCount = document.getElementById('resultCount');
    resultBar.style.display = 'flex';
    resultCount.textContent = `${filtered.length} 件のキャンプ場が見つかりました`;

    // カードエリア
    const resultList = document.getElementById('resultList');
    const campCards  = document.getElementById('campCards');

    if (filtered.length === 0) {
      campCards.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏕️</div>
          <div class="empty-state-text">条件に合うキャンプ場が見つかりませんでした。<br>条件を変えて再検索してみてください。</div>
        </div>`;
      resultList.style.display = 'block';
      return;
    }

    // マーカー & カード生成
    const bounds = [];
    filtered.forEach((c, i) => {
      const marker = L.marker([c.lat, c.lng], { icon: createCampIcon(c.review_count) })
        .addTo(map)
        .bindPopup(buildPopup(c, openPeriod), { maxWidth: 260 });
      markers.push(marker);
      bounds.push([c.lat, c.lng]);
    });

    // 地図を結果にフィット
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    // カード表示
    campCards.innerHTML = filtered.map((c, i) => buildCard(c, i, openPeriod)).join('');
    resultList.style.display = 'block';

    // カードまでスクロール（モバイル）
    if (window.innerWidth < 768) {
      resultList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    console.error(err);
    alert('データの読み込みに失敗しました。');
  } finally {
    btn.innerHTML = '<span class="btn-icon">🔍</span> 検索する';
    btn.disabled = false;
  }
};

// ===== リセット =====
window.resetFilter = function() {
  document.getElementById('pref').value       = '';
  document.getElementById('review').value     = '10';
  document.getElementById('sort').value       = 'asc';
  document.getElementById('openPeriod').value = '0';

  markers.forEach(m => m.remove());
  markers = [];

  document.getElementById('resultBar').style.display  = 'none';
  document.getElementById('resultList').style.display = 'none';

  map.setView([36.5, 138.0], 6);
};

// ===== 初期化 =====
locateUser();
