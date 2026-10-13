// Общие помощники: форматирование денег, количества и телефона, экранирование, всплывающие подсказки, звук.
var U = (function () {
  var moneyFmt = new Intl.NumberFormat('ru-RU');

  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#e7f2e3"/>' +
    '<path d="M50 72c-12-6-18-16-16-28 12-2 22 4 26 16 3-10 10-16 20-16 0 14-10 24-30 28z" fill="#9cc79a"/>' +
    '</svg>'
  );

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    return moneyFmt.format(Math.round(n)) + ' ₽';
  }

  function qty(q, unit) {
    return String(Math.round(q * 10) / 10).replace('.', ',') + ' ' + unit;
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function phoneDigits(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d && d.charAt(0) !== '7') d = '7' + d;
    return d.slice(0, 11);
  }

  function formatPhone(value) {
    var d = phoneDigits(value);
    if (!d) return '';
    var p = d.slice(1);
    var out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length > 3) out += ') ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }

  function dateTime(iso) {
    var d = new Date(iso), now = new Date();
    var time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    var yesterday = new Date(now.getTime() - 86400000);
    if (d.toDateString() === now.toDateString()) return 'сегодня, ' + time;
    if (d.toDateString() === yesterday.toDateString()) return 'вчера, ' + time;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + time;
  }

  function toast(text) {
    var wrap = document.getElementById('toasts');
    if (!wrap) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    wrap.appendChild(t);
    setTimeout(function () { t.className += ' is-hiding'; }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
  }

  // Браузеры разрешают звук только после нажатия пользователя, поэтому «будим» звук при входе в панель.
  var audioCtx = null;
  function unlockAudio() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* без звука */ }
  }

  function beep() {
    try {
      unlockAudio();
      if (!audioCtx) return;
      [0, 0.18].forEach(function (t, i) {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        var start = audioCtx.currentTime + t;
        o.type = 'sine';
        o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(start);
        o.stop(start + 0.18);
      });
    } catch (e) { /* без звука */ }
  }

  // Уменьшает фото перед сохранением, чтобы оно быстро грузилось у покупателей.
  function resizeImage(file, max) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return {
    PLACEHOLDER: PLACEHOLDER,
    esc: esc,
    money: money,
    qty: qty,
    plural: plural,
    phoneDigits: phoneDigits,
    formatPhone: formatPhone,
    dateTime: dateTime,
    toast: toast,
    unlockAudio: unlockAudio,
    beep: beep,
    resizeImage: resizeImage
  };
})();
