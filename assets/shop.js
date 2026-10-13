// Витрина: каталог, корзина и оформление заказа.
var Shop = (function () {
  var grid = document.getElementById('products');
  var chips = document.getElementById('chips');
  var bar = document.getElementById('cart-bar');
  var drawer = document.getElementById('cart');
  var body = document.getElementById('cart-body');
  var esc = U.esc, money = U.money;

  var cart = Store.getCart(); // { id товара: количество }
  var drawerMode = 'closed'; // closed | order | success

  function stepOf(p) { return p.step || (p.unit === 'кг' ? 0.5 : 1); }
  function minOf(p) { return p.min || stepOf(p); }
  function round(n) { return Math.round(n * 10) / 10; }

  // Убираем из корзины то, что продавец удалил или снял с продажи.
  function cleanCart() {
    Object.keys(cart).forEach(function (id) {
      var p = Store.product(id);
      if (!p || !p.inStock) delete cart[id];
    });
  }

  function totals() {
    var s = Store.settings();
    var items = [];
    Object.keys(cart).forEach(function (id) {
      var p = Store.product(id);
      if (!p || !p.inStock) return;
      items.push({ productId: id, name: p.name, unit: p.unit, price: p.price, qty: cart[id], sum: Math.round(p.price * cart[id]) });
    });
    var subtotal = items.reduce(function (a, i) { return a + i.sum; }, 0);
    var delivery = subtotal === 0 || subtotal >= s.freeDeliveryFrom ? 0 : s.deliveryCost;
    return {
      items: items,
      count: items.length,
      subtotal: subtotal,
      delivery: delivery,
      total: subtotal + delivery,
      belowMin: subtotal < s.minOrder
    };
  }

  function changeQty(id, dir) {
    var p = Store.product(id);
    if (!p || !p.inStock) return;
    var cur = cart[id] || 0;
    var next = dir > 0 ? (cur ? round(cur + stepOf(p)) : minOf(p)) : round(cur - stepOf(p));
    if (next > 999) next = 999;
    if (next < minOf(p)) delete cart[id];
    else cart[id] = next;
    Store.setCart(cart);
    update(id);
  }

  /* ---------- Каталог ---------- */

  function renderInfo() {
    var s = Store.settings();
    var delivery = s.deliveryCost > 0
      ? 'Доставка <b>' + money(s.deliveryCost) + '</b>' + (s.freeDeliveryFrom > 0 ? ', от ' + money(s.freeDeliveryFrom) + ' — бесплатно' : '')
      : 'Доставка <b>бесплатно</b>';
    chips.innerHTML =
      '<li>' + delivery + '</li>' +
      (s.minOrder > 0 ? '<li>Минимальный заказ <b>' + money(s.minOrder) + '</b></li>' : '') +
      '<li>Оплата <b>при получении</b></li>';
  }

  function stepperHtml(p, q, small) {
    return '<div class="stepper' + (small ? ' stepper-sm' : '') + '">' +
      '<button type="button" data-action="dec" data-id="' + esc(p.id) + '" aria-label="Меньше: ' + esc(p.name) + '">−</button>' +
      '<output>' + U.qty(q, esc(p.unit)) + '</output>' +
      '<button type="button" data-action="inc" data-id="' + esc(p.id) + '" aria-label="Больше: ' + esc(p.name) + '">+</button>' +
      '</div>';
  }

  function ctrlHtml(p) {
    if (!p.inStock) return '<span class="soon">Скоро снова будет</span>';
    var q = cart[p.id];
    if (!q) return '<button type="button" class="btn btn-soft btn-block" data-action="add" data-id="' + esc(p.id) + '">В корзину</button>';
    return stepperHtml(p, q);
  }

  function cardHtml(p) {
    return '<article class="card' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '">' +
      '<div class="card-img"><img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      (p.inStock ? '' : '<span class="tag-out">Нет в наличии</span>') + '</div>' +
      '<div class="card-body">' +
      '<h3>' + esc(p.name) + '</h3>' +
      (p.note ? '<p class="note">' + esc(p.note) + '</p>' : '') +
      '<div class="card-foot">' +
      '<div class="price"><b>' + money(p.price) + '</b><span>за ' + esc(p.unit) + '</span></div>' +
      '<div class="card-ctrl">' + ctrlHtml(p) + '</div>' +
      '</div></div></article>';
  }

  function renderProducts() {
    var list = Store.products().slice().sort(function (a, b) { return (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0); });
    grid.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<p class="muted">Скоро здесь появятся овощи нового урожая.</p>';
  }

  function renderBar() {
    var t = totals();
    var visible = t.count > 0 && drawerMode === 'closed';
    bar.className = 'cart-bar' + (visible ? ' is-visible' : '');
    bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
    bar.innerHTML =
      '<div class="cart-bar-info"><span>' + t.count + ' ' + U.plural(t.count, 'товар', 'товара', 'товаров') + '</span>' +
      '<b>' + money(t.subtotal) + '</b></div>' +
      '<button type="button" class="btn btn-accent" data-action="open-cart"' + (visible ? '' : ' tabindex="-1"') + '>Оформить заказ</button>';
  }

  function update(id) {
    var ctrl = grid.querySelector('.card[data-id="' + id + '"] .card-ctrl');
    var p = Store.product(id);
    if (ctrl && p) ctrl.innerHTML = ctrlHtml(p);
    renderBar();
    if (drawerMode === 'order') renderCartLines();
  }

  /* ---------- Корзина и оформление ---------- */

  function openCart() {
    cleanCart();
    drawerMode = 'order';
    renderOrderForm();
    drawer.className = 'drawer is-open';
    drawer.setAttribute('aria-hidden', 'false');
    document.body.className += ' no-scroll';
    renderBar();
    setTimeout(function () { var c = drawer.querySelector('.icon-btn'); if (c) c.focus(); }, 60);
  }

  function closeCart() {
    if (drawerMode === 'closed') return;
    drawer.className = 'drawer';
    drawer.setAttribute('aria-hidden', 'true');
    document.body.className = document.body.className.replace(/\s*no-scroll/g, '');
    drawerMode = 'closed';
    renderBar();
  }

  function emptyHtml() {
    return '<div class="empty-cart"><p>В корзине пока пусто.</p>' +
      '<button type="button" class="btn btn-soft" data-action="close-cart">Выбрать овощи</button></div>';
  }

  function renderOrderForm() {
    if (!totals().count) { body.innerHTML = emptyHtml(); return; }
    body.innerHTML =
      '<div id="cart-items"></div>' +
      '<div id="cart-summary" class="summary"></div>' +
      '<form id="order-form" class="order-form" novalidate>' +
      '<h3>Куда привезти</h3>' +
      '<label class="field" data-field="name"><span>Ваше имя</span>' +
      '<input name="name" autocomplete="name" maxlength="60"><em class="err"></em></label>' +
      '<label class="field" data-field="phone"><span>Телефон</span>' +
      '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__"><em class="err"></em></label>' +
      '<label class="field" data-field="address"><span>Адрес доставки</span>' +
      '<textarea name="address" rows="2" autocomplete="street-address" maxlength="300" placeholder="Улица, дом, подъезд, этаж, квартира"></textarea><em class="err"></em></label>' +
      '<label class="field"><span>Когда удобно принять заказ</span><select name="time">' +
      '<option>Любое время с 10:00 до 20:00</option><option>Утром, 10:00–14:00</option>' +
      '<option>Днём, 14:00–18:00</option><option>Вечером, 18:00–20:00</option></select></label>' +
      '<label class="field"><span>Комментарий <i>— необязательно</i></span>' +
      '<textarea name="comment" rows="2" maxlength="300" placeholder="Например: позвоните за час до приезда"></textarea></label>' +
      '<div class="field" data-field="consent"><label class="check"><input type="checkbox" name="consent">' +
      '<span>Согласен на обработку персональных данных по <a href="#policy" target="_blank">политике конфиденциальности</a></span></label>' +
      '<em class="err"></em></div>' +
      '<div id="cart-submit"></div>' +
      '<p class="pay-note">Оплата при получении — наличными или переводом. Мы позвоним, чтобы подтвердить заказ.</p>' +
      '</form>';
    renderCartLines();
  }

  function renderCartLines() {
    var items = document.getElementById('cart-items');
    if (!items) return;
    var t = totals();
    if (!t.count) { body.innerHTML = emptyHtml(); return; }
    var s = Store.settings();

    items.innerHTML = t.items.map(function (i) {
      var p = Store.product(i.productId);
      return '<div class="ci">' +
        '<img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="">' +
        '<div class="ci-info"><b>' + esc(i.name) + '</b><span>' + money(i.price) + ' за ' + esc(i.unit) + '</span></div>' +
        '<div class="ci-side">' + stepperHtml(p, i.qty, true) + '<b class="ci-sum">' + money(i.sum) + '</b></div>' +
        '</div>';
    }).join('');

    var left = s.freeDeliveryFrom - t.subtotal;
    document.getElementById('cart-summary').innerHTML =
      '<div class="sum-row"><span>Товары</span><span>' + money(t.subtotal) + '</span></div>' +
      '<div class="sum-row"><span>Доставка</span><span>' + (t.delivery ? money(t.delivery) : 'бесплатно') + '</span></div>' +
      (t.delivery && s.freeDeliveryFrom > 0 && left > 0 ? '<p class="hint">Добавьте ещё на ' + money(left) + ' — и доставка будет бесплатной</p>' : '') +
      '<div class="sum-row sum-total"><span>Итого</span><span>' + money(t.total) + '</span></div>' +
      (t.belowMin ? '<p class="warn">Минимальная сумма заказа — ' + money(s.minOrder) + '. Добавьте товаров ещё на ' + money(s.minOrder - t.subtotal) + '.</p>' : '');

    document.getElementById('cart-submit').innerHTML =
      '<button type="submit" class="btn btn-primary btn-block btn-lg"' + (t.belowMin ? ' disabled' : '') + '>Заказать · ' + money(t.total) + '</button>';
  }

  function showErrors(form, errs) {
    var fields = form.querySelectorAll('[data-field]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-field');
      var msg = errs[key] || '';
      fields[i].className = fields[i].className.replace(/\s*invalid/g, '') + (msg ? ' invalid' : '');
      fields[i].querySelector('.err').textContent = msg;
    }
  }

  function onSubmit(e) {
    if (!e.target || e.target.id !== 'order-form') return;
    e.preventDefault();
    var form = e.target;
    var t = totals();
    if (!t.count || t.belowMin) return;

    var f = function (n) { return form.elements.namedItem(n); };
    var v = {
      name: f('name').value.trim(),
      phone: f('phone').value,
      address: f('address').value.trim(),
      time: f('time').value,
      comment: f('comment').value.trim(),
      consent: f('consent').checked
    };

    var errs = {};
    if (v.name.length < 2) errs.name = 'Укажите, как к вам обращаться';
    if (U.phoneDigits(v.phone).length !== 11) errs.phone = 'Укажите номер полностью, 10 цифр после +7';
    if (v.address.length < 6) errs.address = 'Укажите улицу, дом и квартиру';
    if (!v.consent) errs.consent = 'Без согласия мы не сможем оформить доставку';
    showErrors(form, errs);

    var firstBad = form.querySelector('.invalid input, .invalid textarea');
    if (firstBad) { firstBad.focus(); return; }

    var order = Store.createOrder({
      customer: { name: v.name, phone: U.formatPhone(v.phone), address: v.address, time: v.time, comment: v.comment },
      items: t.items,
      subtotal: t.subtotal,
      delivery: t.delivery,
      total: t.total,
      notifyEmail: Store.settings().email
    });

    cart = {};
    Store.setCart(cart);
    renderProducts();
    drawerMode = 'success';
    renderSuccess(order);
    renderBar();
  }

  function renderSuccess(o) {
    body.innerHTML =
      '<div class="success">' +
      '<div class="success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h3>Заказ № ' + o.id + ' принят</h3>' +
      '<p>Спасибо, ' + esc(o.customer.name) + '! Мы позвоним на <span class="nowrap">' + esc(o.customer.phone) + '</span>, чтобы подтвердить заказ и время доставки.</p>' +
      '<div class="receipt">' +
      o.items.map(function (i) {
        return '<div class="sum-row"><span>' + esc(i.name) + ', ' + U.qty(i.qty, esc(i.unit)) + '</span><span>' + money(i.sum) + '</span></div>';
      }).join('') +
      '<div class="sum-row"><span>Доставка</span><span>' + (o.delivery ? money(o.delivery) : 'бесплатно') + '</span></div>' +
      '<div class="sum-row sum-total"><span>К оплате при получении</span><span>' + money(o.total) + '</span></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="close-cart">Вернуться в магазин</button>' +
      '<p class="demo-hint">Демо: откройте <a href="#admin">панель продавца</a> — заказ уже там, вместе с письмом, которое пришло бы вам на почту.</p>' +
      '</div>';
    body.scrollTop = 0;
  }

  /* ---------- События ---------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!btn) return;
    var a = btn.getAttribute('data-action'), id = btn.getAttribute('data-id');
    if (a === 'add' || a === 'inc') changeQty(id, 1);
    else if (a === 'dec') changeQty(id, -1);
    else if (a === 'open-cart') openCart();
    else if (a === 'close-cart') closeCart();
    else if (a === 'scroll-products') document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  body.addEventListener('submit', onSubmit);

  body.addEventListener('input', function (e) {
    var el = e.target;
    if (el.name === 'phone') el.value = U.formatPhone(el.value);
    var field = el.closest ? el.closest('.invalid') : null;
    if (field) {
      field.className = field.className.replace(/\s*invalid/g, '');
      field.querySelector('.err').textContent = '';
    }
  });

  body.addEventListener('change', function (e) {
    if (e.target.name !== 'consent') return;
    var field = e.target.closest('.invalid');
    if (field) {
      field.className = field.className.replace(/\s*invalid/g, '');
      field.querySelector('.err').textContent = '';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
  });

  return {
    render: function () {
      cleanCart();
      renderInfo();
      renderProducts();
      renderBar();
    },
    // Данные поменялись в соседней вкладке (например, продавец сменил цену).
    refresh: function () {
      cart = Store.getCart();
      cleanCart();
      renderInfo();
      renderProducts();
      renderBar();
      if (drawerMode === 'order') renderCartLines();
    },
    closeCart: closeCart
  };
})();
