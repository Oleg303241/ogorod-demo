// Переключение страниц (магазин / панель продавца / политика) и подписи из настроек магазина.
var App = (function () {
  var views = {
    shop: document.getElementById('view-shop'),
    admin: document.getElementById('view-admin'),
    policy: document.getElementById('view-policy')
  };
  var current = null;

  function route() {
    var h = location.hash.replace('#', '');
    return h === 'admin' || h === 'policy' ? h : 'shop';
  }

  function bindSettings() {
    var s = Store.settings();
    var i, els = document.querySelectorAll('[data-bind]');
    for (i = 0; i < els.length; i++) els[i].textContent = s[els[i].getAttribute('data-bind')] || '';
    els = document.querySelectorAll('[data-bind-href]');
    for (i = 0; i < els.length; i++) {
      els[i].href = els[i].getAttribute('data-bind-href') === 'tel'
        ? 'tel:+' + U.phoneDigits(s.phone)
        : 'mailto:' + s.email;
    }
  }

  function setShopTitle() {
    document.title = Store.settings().shopName + ' — свежие овощи с доставкой';
  }

  function show() {
    var r = route();
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== r; });
    if (r !== 'shop') Shop.closeCart();
    if (r === 'shop') {
      Shop.render();
      setShopTitle();
    } else if (r === 'admin') {
      Admin.render();
    } else {
      document.title = 'Политика конфиденциальности — ' + Store.settings().shopName;
    }
    if (r !== current) window.scrollTo(0, 0);
    current = r;
  }

  window.addEventListener('hashchange', show);

  // Заказ, оформленный в одной вкладке, сразу появляется в панели продавца в другой.
  window.addEventListener('storage', function (e) {
    if (e.key !== Store.KEY && e.key !== null) return;
    var before = Store.orders().length;
    Store.reload();
    bindSettings();
    if (route() === 'shop') { Shop.refresh(); setShopTitle(); }
    if (route() === 'admin') Admin.onExternalChange(before);
  });

  bindSettings();
  show();

  return { bindSettings: bindSettings };
})();
