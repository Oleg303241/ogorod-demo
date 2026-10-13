// Хранилище магазина: настройки, товары, заказы и корзина.
// В демо всё лежит в памяти этого браузера (localStorage), поэтому заказы видны только на этом компьютере.
// В рабочей версии эти же функции будут обращаться к серверу в России — витрина и панель продавца не изменятся.
var Store = (function () {
  var KEY = 'ogorod-demo-v1';
  var CART_KEY = 'ogorod-demo-cart';

  var DEFAULTS = {
    nextOrderNo: 1001,
    settings: {
      shopName: 'Огород рядом',
      tagline: 'Свежие овощи с грядки — привезём завтра',
      deliveryNote: 'Собираем урожай утром и доставляем по городу на следующий день, с 10:00 до 20:00.',
      phone: '+7 (900) 000-00-00',
      email: 'zakaz@example.ru',
      deliveryCost: 200,
      freeDeliveryFrom: 2000,
      minOrder: 700,
      adminPassword: '1234'
    },
    products: [
      { id: 'p1', name: 'Огурцы грунтовые', note: 'Хрустящие, сорваны вчера', price: 150, unit: 'кг', step: 0.5, min: 1, img: 'img/cucumbers.jpg', inStock: true },
      { id: 'p2', name: 'Помидоры', note: 'Красные, сладкие, на ветке', price: 250, unit: 'кг', step: 0.5, min: 1, img: 'img/tomatoes.jpg', inStock: true },
      { id: 'p3', name: 'Картофель молодой', note: 'Рассыпчатый, для пюре и жарки', price: 60, unit: 'кг', step: 1, min: 2, img: 'img/potatoes.jpg', inStock: true },
      { id: 'p4', name: 'Морковь', note: 'Сочная, с ботвой', price: 70, unit: 'кг', step: 0.5, min: 1, img: 'img/carrots.jpg', inStock: true },
      { id: 'p5', name: 'Лук репчатый', note: 'Золотистый, хорошо хранится', price: 50, unit: 'кг', step: 0.5, min: 1, img: 'img/onions.jpg', inStock: true },
      { id: 'p6', name: 'Капуста белокочанная', note: 'Кочан около 2 кг', price: 90, unit: 'шт', step: 1, min: 1, img: 'img/cabbage.jpg', inStock: true },
      { id: 'p7', name: 'Зелень: укроп и петрушка', note: 'Большой пучок', price: 50, unit: 'шт', step: 1, min: 1, img: 'img/greens.jpg', inStock: true },
      { id: 'p8', name: 'Перец сладкий', note: 'Мясистый, красный и оранжевый', price: 280, unit: 'кг', step: 0.5, min: 0.5, img: 'img/peppers.jpg', inStock: false }
    ],
    orders: []
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function load() {
    var base = clone(DEFAULTS);
    var saved = read(KEY);
    if (!saved || !Array.isArray(saved.products)) return base;
    base.nextOrderNo = saved.nextOrderNo || base.nextOrderNo;
    base.settings = Object.assign(base.settings, saved.settings || {});
    base.products = saved.products;
    base.orders = Array.isArray(saved.orders) ? saved.orders : [];
    return base;
  }

  var state = load();
  var warned = false;

  function persist() {
    if (write(KEY, state)) return true;
    if (!warned) {
      warned = true;
      U.toast('Браузер не даёт сохранять данные: демо работает, пока открыта вкладка');
    }
    return false;
  }

  return {
    KEY: KEY,
    settings: function () { return state.settings; },
    products: function () { return state.products; },
    product: function (id) {
      for (var i = 0; i < state.products.length; i++) if (state.products[i].id === id) return state.products[i];
      return null;
    },
    orders: function () { return state.orders; },

    saveSettings: function (patch) {
      Object.assign(state.settings, patch);
      return persist();
    },

    saveProducts: function (list) {
      state.products = list;
      return persist();
    },

    createOrder: function (data) {
      var order = Object.assign({ id: state.nextOrderNo, createdAt: new Date().toISOString(), seen: false }, data);
      state.nextOrderNo += 1;
      state.orders.unshift(order);
      persist();
      return order;
    },

    markSeen: function (id) {
      state.orders.forEach(function (o) { if (o.id === id) o.seen = true; });
      persist();
    },

    getCart: function () {
      var c = read(CART_KEY);
      return c && typeof c === 'object' ? c : {};
    },

    setCart: function (cart) { write(CART_KEY, cart); },

    // Перечитать данные, если их изменили в соседней вкладке.
    reload: function () { state = load(); },

    reset: function () {
      state = clone(DEFAULTS);
      persist();
      write(CART_KEY, {});
    }
  };
})();
