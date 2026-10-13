// Панель продавца: заказы, товары и настройки. Вход по паролю.
var Admin = (function () {
  var root = document.getElementById('view-admin');
  var esc = U.esc, money = U.money;
  var AUTH_KEY = 'ogorod-demo-admin';
  var memoryAuth = false;
  var tab = 'orders';
  var openId = null;

  var LEAF = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2e7d32"/>' +
    '<path d="M16 24c-5-2.5-7.5-7-6.5-12 5-.8 9 1.8 10.5 6.5 1.2-4 4-6.3 8-6.3 0 6-4.4 10.4-12 11.8z" fill="#fff"/></svg>';

  function authed() {
    if (memoryAuth) return true;
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; }
  }

  function setAuthed(on) {
    memoryAuth = on;
    try {
      if (on) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (e) { /* хватит памяти вкладки */ }
  }

  function newCount() {
    return Store.orders().filter(function (o) { return !o.seen; }).length;
  }

  function updateTitle() {
    var n = newCount();
    document.title = (n ? '(' + n + ') ' : '') + 'Панель продавца — ' + Store.settings().shopName;
  }

  /* ---------- Вход ---------- */

  function loginHtml() {
    return '<div class="login"><form class="login-card" data-form="login" novalidate>' +
      LEAF +
      '<h1>Панель продавца</h1>' +
      '<p class="muted">Здесь приходят заказы, а вы меняете цены и наличие товаров.</p>' +
      '<label class="field" data-field="password"><span>Пароль</span>' +
      '<input type="password" name="password" autocomplete="current-password"><em class="err"></em></label>' +
      '<button type="submit" class="btn btn-primary btn-block">Войти</button>' +
      '<p class="demo-hint">В демо пароль: 1234</p>' +
      '<a class="back-link" href="#">← Вернуться в магазин</a>' +
      '</form></div>';
  }

  /* ---------- Каркас панели ---------- */

  function panelHtml() {
    return '<header class="admin-head"><div class="wrap admin-head-in">' +
      '<div class="admin-brand">' + LEAF + '<div><span class="admin-kicker">Панель продавца</span><b>' + esc(Store.settings().shopName) + '</b></div></div>' +
      '<nav class="admin-nav"><a class="btn btn-on-dark" href="#" target="_blank">Открыть магазин</a>' +
      '<button type="button" class="btn btn-on-dark" data-a="logout">Выйти</button></nav>' +
      '</div></header>' +
      '<div class="wrap admin-wrap"><div class="tabs" id="admin-tabs" role="tablist"></div><div id="admin-content"></div></div>';
  }

  function renderTabs() {
    var el = document.getElementById('admin-tabs');
    if (!el) return;
    var n = newCount();
    var tabs = [['orders', 'Заказы' + (n ? ' <span class="badge">' + n + '</span>' : '')], ['products', 'Товары'], ['settings', 'Настройки']];
    el.innerHTML = tabs.map(function (t) {
      return '<button type="button" role="tab" class="tab' + (tab === t[0] ? ' is-active' : '') + '" aria-selected="' + (tab === t[0]) + '" data-a="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
  }

  function renderContent() {
    var el = document.getElementById('admin-content');
    if (!el) return;
    if (tab === 'orders') el.innerHTML = ordersHtml();
    else if (tab === 'products') el.innerHTML = productsHtml();
    else el.innerHTML = settingsHtml();
  }

  function render() {
    if (!authed()) {
      root.innerHTML = loginHtml();
      document.title = 'Вход — панель продавца';
      var input = root.querySelector('input');
      if (input) input.focus();
      return;
    }
    root.innerHTML = panelHtml();
    renderTabs();
    renderContent();
    updateTitle();
  }

  /* ---------- Заказы ---------- */

  function ordersHtml() {
    var orders = Store.orders();
    if (!orders.length) {
      return '<div class="empty"><h3>Заказов пока нет</h3>' +
        '<p>Откройте <a href="#" target="_blank">магазин в соседней вкладке</a> и оформите тестовый заказ. ' +
        'Он появится здесь сразу, со звуковым сигналом.</p></div>';
    }
    return '<p class="muted list-note">Новые заказы сверху. Нажмите на заказ, чтобы увидеть подробности и письмо, которое приходит на почту.</p>' +
      orders.map(orderHtml).join('');
  }

  function orderHtml(o) {
    var open = openId === o.id;
    var what = o.items.map(function (i) { return i.name + ' ' + U.qty(i.qty, i.unit); }).join(', ');
    return '<article class="order' + (o.seen ? '' : ' is-new') + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="order-head" data-a="toggle-order" data-id="' + o.id + '" aria-expanded="' + open + '">' +
      '<span class="order-top"><b class="order-no">№ ' + o.id + '</b>' + (o.seen ? '' : '<span class="badge-new">новый</span>') +
      '<span class="order-when">' + U.dateTime(o.createdAt) + '</span></span>' +
      '<span class="order-who">' + esc(o.customer.name) + ' · ' + esc(o.customer.phone) + '</span>' +
      '<span class="order-what">' + esc(what) + '</span>' +
      '<b class="order-total">' + money(o.total) + '</b>' +
      '</button>' +
      (open ? orderDetailsHtml(o) : '') +
      '</article>';
  }

  function orderDetailsHtml(o) {
    var c = o.customer;
    return '<div class="order-details">' +
      '<div class="order-actions">' +
      '<a class="btn btn-primary" href="tel:+' + U.phoneDigits(c.phone) + '">Позвонить</a>' +
      '<a class="btn btn-ghost" href="https://yandex.ru/maps/?text=' + encodeURIComponent(c.address) + '" target="_blank" rel="noopener">Адрес на карте</a>' +
      '</div>' +
      '<dl class="kv"><dt>Адрес</dt><dd>' + esc(c.address) + '</dd>' +
      '<dt>Когда удобно</dt><dd>' + esc(c.time) + '</dd>' +
      (c.comment ? '<dt>Комментарий</dt><dd>' + esc(c.comment) + '</dd>' : '') + '</dl>' +
      '<table class="items"><thead><tr><th>Товар</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>' +
      o.items.map(function (i) {
        return '<tr><td>' + esc(i.name) + '<small>' + money(i.price) + ' за ' + esc(i.unit) + '</small></td><td>' + U.qty(i.qty, esc(i.unit)) + '</td><td>' + money(i.sum) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot>' +
      '<tr><td colspan="2">Доставка</td><td>' + (o.delivery ? money(o.delivery) : 'бесплатно') + '</td></tr>' +
      '<tr class="tt"><td colspan="2">Итого к оплате</td><td>' + money(o.total) + '</td></tr>' +
      '</tfoot></table>' +
      '<details class="mail"><summary>Письмо, которое пришло на ' + esc(o.notifyEmail) + '</summary>' + emailHtml(o) + '</details>' +
      '</div>';
  }

  function emailHtml(o) {
    var c = o.customer;
    var when = new Date(o.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return '<div class="mail-box">' +
      '<div class="mail-meta">' +
      '<div><span>От:</span> Сайт «' + esc(Store.settings().shopName) + '»</div>' +
      '<div><span>Кому:</span> ' + esc(o.notifyEmail) + '</div>' +
      '<div><span>Тема:</span> Новый заказ № ' + o.id + ' на ' + money(o.total) + '</div>' +
      '</div>' +
      '<div class="mail-body">' +
      '<p><b>Новый заказ № ' + o.id + '</b><br>' + esc(when) + '</p>' +
      '<p>Покупатель: ' + esc(c.name) + '<br>Телефон: ' + esc(c.phone) + '<br>Адрес: ' + esc(c.address) +
      '<br>Когда удобно: ' + esc(c.time) + (c.comment ? '<br>Комментарий: ' + esc(c.comment) : '') + '</p>' +
      '<p>' + o.items.map(function (i) {
        return esc(i.name) + ' — ' + U.qty(i.qty, esc(i.unit)) + ' × ' + money(i.price) + ' = ' + money(i.sum);
      }).join('<br>') + '</p>' +
      '<p>Доставка: ' + (o.delivery ? money(o.delivery) : 'бесплатно') + '<br><b>Итого к оплате при получении: ' + money(o.total) + '</b></p>' +
      '</div></div>';
  }

  /* ---------- Товары ---------- */

  function productsHtml() {
    return '<div class="toolbar"><p class="muted">Изменения сохраняются сразу и видны покупателям.</p>' +
      '<button type="button" class="btn btn-primary" data-a="add-product">+ Добавить товар</button></div>' +
      '<div class="plist">' + Store.products().map(prowHtml).join('') + '</div>';
  }

  function prowHtml(p) {
    return '<div class="prow' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '">' +
      '<label class="pimg" title="Сменить фото"><img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="">' +
      '<input type="file" accept="image/*" data-f="img"><span>Сменить фото</span></label>' +
      '<div class="pfields">' +
      '<label class="field"><span>Название</span><input data-f="name" value="' + esc(p.name) + '" maxlength="60"></label>' +
      '<label class="field"><span>Описание</span><input data-f="note" value="' + esc(p.note || '') + '" maxlength="80" placeholder="Например: сорван вчера"></label>' +
      '<div class="prow-line">' +
      '<label class="field field-sm"><span>Цена, ₽</span><input data-f="price" type="number" min="1" max="100000" step="1" inputmode="numeric" value="' + p.price + '"></label>' +
      '<label class="field field-sm"><span>За</span><select data-f="unit">' +
      ['кг', 'шт'].map(function (u) { return '<option' + (u === p.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="switch"><input type="checkbox" data-f="inStock"' + (p.inStock ? ' checked' : '') + '>' +
      '<span class="switch-ui" aria-hidden="true"></span><span>В наличии</span></label>' +
      '<button type="button" class="btn btn-ghost btn-danger" data-a="delete-product" data-id="' + esc(p.id) + '">Удалить</button>' +
      '</div></div></div>';
  }

  function onProductChange(el) {
    var row = el.closest('.prow');
    if (!row) return;
    var list = Store.products();
    var p = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === row.getAttribute('data-id')) p = list[i];
    if (!p) return;
    var f = el.getAttribute('data-f');

    if (f === 'img') {
      var file = el.files && el.files[0];
      if (!file) return;
      U.resizeImage(file, 640).then(function (url) {
        var old = p.img;
        p.img = url;
        if (Store.saveProducts(list)) {
          row.querySelector('.pimg img').src = url;
          U.toast('Фото обновлено');
        } else {
          p.img = old;
          U.toast('Фото слишком большое для демо-версии');
        }
      }, function () { U.toast('Не получилось открыть это фото'); });
      return;
    }

    if (f === 'name') {
      var name = el.value.trim();
      if (!name) { el.value = p.name; U.toast('Название не может быть пустым'); return; }
      p.name = name;
    } else if (f === 'note') {
      p.note = el.value.trim();
    } else if (f === 'price') {
      var price = Math.round(Number(el.value));
      if (!(price > 0)) { el.value = p.price; U.toast('Укажите цену больше нуля'); return; }
      p.price = price;
      el.value = price;
    } else if (f === 'unit') {
      p.unit = el.value;
      p.step = p.unit === 'кг' ? 0.5 : 1;
      p.min = 1;
    } else if (f === 'inStock') {
      p.inStock = el.checked;
      row.className = 'prow' + (p.inStock ? '' : ' is-out');
    }
    if (Store.saveProducts(list)) U.toast('Сохранено');
  }

  function addProduct() {
    var list = Store.products();
    list.unshift({ id: 'p' + Date.now(), name: 'Новый товар', note: '', price: 100, unit: 'кг', step: 0.5, min: 1, img: '', inStock: false });
    Store.saveProducts(list);
    renderContent();
    var input = root.querySelector('.prow input[data-f="name"]');
    if (input) { input.focus(); input.select(); }
    U.toast('Заполните товар, добавьте фото и включите «В наличии»');
  }

  function deleteProduct(id) {
    var p = Store.product(id);
    if (!p || !window.confirm('Удалить «' + p.name + '»? Покупатели перестанут его видеть.')) return;
    Store.saveProducts(Store.products().filter(function (x) { return x.id !== id; }));
    renderContent();
    U.toast('Товар удалён');
  }

  /* ---------- Настройки ---------- */

  var SETTINGS_FIELDS = [
    ['shopName', 'Название магазина', 'text'],
    ['tagline', 'Заголовок на главной', 'text'],
    ['phone', 'Телефон для покупателей', 'tel'],
    ['email', 'Почта, куда приходят заказы', 'email'],
    ['deliveryCost', 'Стоимость доставки, ₽', 'number'],
    ['freeDeliveryFrom', 'Бесплатная доставка от, ₽', 'number'],
    ['minOrder', 'Минимальная сумма заказа, ₽', 'number'],
    ['adminPassword', 'Пароль от этой панели', 'text']
  ];

  function settingsHtml() {
    var s = Store.settings();
    return '<form class="settings" data-form="settings" novalidate><div class="settings-grid">' +
      SETTINGS_FIELDS.map(function (f) {
        return '<label class="field" data-field="' + f[0] + '"><span>' + f[1] + '</span>' +
          '<input name="' + f[0] + '" type="' + f[2] + '"' + (f[2] === 'number' ? ' min="0" step="1" inputmode="numeric"' : '') +
          ' value="' + esc(s[f[0]]) + '"><em class="err"></em></label>';
      }).join('') +
      '<label class="field field-wide"><span>Условия доставки — текст под заголовком</span>' +
      '<textarea name="deliveryNote" rows="2" maxlength="200">' + esc(s.deliveryNote) + '</textarea></label>' +
      '</div><button type="submit" class="btn btn-primary">Сохранить настройки</button></form>' +
      '<div class="danger-zone"><div><h3>Демо-данные</h3><p class="muted">Вернуть исходные товары и цены и удалить тестовые заказы.</p></div>' +
      '<button type="button" class="btn btn-ghost btn-danger" data-a="reset">Сбросить демо</button></div>';
  }

  function saveSettings(form) {
    var get = function (n) { return form.elements.namedItem(n).value.trim(); };
    var patch = {}, errs = {};
    SETTINGS_FIELDS.forEach(function (f) {
      var v = get(f[0]);
      if (f[2] === 'number') {
        var n = Math.round(Number(v));
        if (v === '' || !(n >= 0)) errs[f[0]] = 'Нужно число, 0 или больше';
        else patch[f[0]] = n;
      } else if (!v) {
        errs[f[0]] = 'Заполните поле';
      } else {
        patch[f[0]] = v;
      }
    });
    if (patch.phone) patch.phone = U.formatPhone(patch.phone) || patch.phone;
    if (patch.adminPassword && patch.adminPassword.length < 4) errs.adminPassword = 'Не короче 4 символов';
    patch.deliveryNote = get('deliveryNote');

    var fields = form.querySelectorAll('[data-field]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-field');
      fields[i].className = 'field' + (errs[key] ? ' invalid' : '');
      fields[i].querySelector('.err').textContent = errs[key] || '';
    }
    if (Object.keys(errs).length) return;

    Store.saveSettings(patch);
    App.bindSettings();
    render();
    U.toast('Настройки сохранены');
  }

  /* ---------- События ---------- */

  root.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!btn) return;
    var a = btn.getAttribute('data-a');
    if (a === 'tab') {
      tab = btn.getAttribute('data-tab');
      renderTabs();
      renderContent();
    } else if (a === 'toggle-order') {
      var id = Number(btn.getAttribute('data-id'));
      openId = openId === id ? null : id;
      Store.markSeen(id);
      renderTabs();
      renderContent();
      updateTitle();
    } else if (a === 'add-product') {
      addProduct();
    } else if (a === 'delete-product') {
      deleteProduct(btn.getAttribute('data-id'));
    } else if (a === 'logout') {
      setAuthed(false);
      location.hash = '';
    } else if (a === 'reset') {
      if (!window.confirm('Сбросить демо? Тестовые заказы удалятся, товары и цены вернутся к исходным.')) return;
      Store.reset();
      openId = null;
      App.bindSettings();
      render();
      U.toast('Демо сброшено');
    }
  });

  root.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-f')) onProductChange(e.target);
  });

  root.addEventListener('submit', function (e) {
    var form = e.target;
    var kind = form.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    if (kind === 'login') {
      var input = form.elements.namedItem('password');
      if (input.value === String(Store.settings().adminPassword)) {
        U.unlockAudio();
        setAuthed(true);
        render();
      } else {
        var field = form.querySelector('[data-field="password"]');
        field.className = 'field invalid';
        field.querySelector('.err').textContent = 'Неверный пароль';
        input.select();
      }
    } else if (kind === 'settings') {
      saveSettings(form);
    }
  });

  return {
    render: render,
    authed: authed,
    // Данные поменялись в соседней вкладке: например, покупатель только что оформил заказ.
    onExternalChange: function (ordersBefore) {
      if (!authed() || root.hidden) return;
      var added = Store.orders().length - ordersBefore;
      if (added > 0) {
        U.beep();
        U.toast('Новый заказ № ' + Store.orders()[0].id);
      }
      renderTabs();
      if (tab === 'orders') renderContent();
      updateTitle();
    }
  };
})();
