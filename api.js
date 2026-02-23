// api.js
// ============================================================
// Live data — BTC price (CoinGecko) + network difficulty (mempool.space)
// Fetches on page load, then refreshes every 10 minutes.
// All fields remain editable — user changes override live values.
// ============================================================

(function () {
  const REFRESH_MS = 10 * 60 * 1000; // 10 minutes

  // ---- helpers ------------------------------------------------

  function field(id)  { return document.getElementById(id); }

  function setBadge(id, text, state) {
    const el = field(id);
    if (!el) return;
    el.textContent = text;
    el.className   = 'live-badge' + (state ? ' ' + state : '');
  }

  function setStatus(text) {
    const el = field('live-data-status');
    if (el) el.textContent = text;
  }

  function timestamp() {
    return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  }

  // ---- fetchers -----------------------------------------------

  async function fetchBtcPrice() {
    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=aud,usd'
    );
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const data = await resp.json();
    return { aud: data.bitcoin.aud, usd: data.bitcoin.usd };
  }

  async function fetchDifficulty() {
    const resp = await fetch('https://mempool.space/api/v1/difficulty-adjustment');
    if (!resp.ok) throw new Error(`mempool.space ${resp.status}`);
    const data = await resp.json();
    if (!data.currentDifficulty) throw new Error('Unexpected response shape');
    return data.currentDifficulty;
  }

  // ---- main load ----------------------------------------------

  async function loadLiveData() {
    setStatus('Fetching live data…');
    setBadge('btc-price-badge',  'loading…', '');
    setBadge('difficulty-badge', 'loading…', '');

    let btcOk  = false;
    let diffOk = false;

    // BTC price
    try {
      const price = await fetchBtcPrice();
      field('btc-price-aud').value = price.aud;
      field('btc-price-usd').value = price.usd;
      setBadge('btc-price-badge', 'live', 'live');
      btcOk = true;
    } catch (err) {
      console.warn('BTC price fetch failed:', err);
      setBadge('btc-price-badge', 'unavailable — edit manually', 'error');
    }

    // Network difficulty
    try {
      const difficulty = await fetchDifficulty();
      field('network-difficulty').value = difficulty;
      setBadge('difficulty-badge', 'live', 'live');
      diffOk = true;
    } catch (err) {
      console.warn('Difficulty fetch failed:', err);
      setBadge('difficulty-badge', 'unavailable — edit manually', 'error');
    }

    // Status message
    const t = timestamp();
    if (btcOk && diffOk) {
      setStatus(`Live data updated at ${t}. Fields are editable — your changes override the live values.`);
    } else if (btcOk || diffOk) {
      setStatus(`Partial live data loaded at ${t}. Fields marked "unavailable" need manual entry.`);
    } else {
      setStatus('Live data unavailable — enter values manually above. Will retry in 10 minutes.');
    }
  }

  // ---- boot ---------------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    loadLiveData();
    setInterval(loadLiveData, REFRESH_MS);
  });

})();
