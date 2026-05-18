/* pages/shop.js — the Shop tab.
   Two surfaces: specialty coffee + replacement parts. Specialty pushes the
   user toward Cuisinart-curated beans, gear, and partner roasters. Parts
   surface the bits people actually need to buy back (charcoal filters,
   descaler, water filters, carafes). Each card opens a real URL in a new
   tab so the demo links cleanly to Cuisinart's DTC. */

const SHOP_CATEGORIES = [
  { key: 'all',      label: 'All' },
  { key: 'beans',    label: 'Beans' },
  { key: 'gear',     label: 'Gear' },
  { key: 'parts',    label: 'Parts' },
  { key: 'cleaning', label: 'Cleaning' }
];

/* Real Cuisinart coffee SKUs + adjacent replacement parts. Names and model
   numbers reflect the actual product lineup. URLs point at the Cuisinart
   coffee category landing page (the Smart Grind & Brew + Pod proposal lives
   above the existing lineup per the Final Ghost Deck). Swap the photo
   fields for local images under `images/` whenever you want — every other
   field stays the same. */
const SHOP_BASE  = 'https://www.cuisinart.com/shopping/appliances/coffee_makers/';
const SHOP_PARTS = 'https://www.cuisinart.com/shopping/replacement_parts/';

const SHOP_PRODUCTS = [
  // FEATURED — the proposed connected Cuisinart from the Ghost Deck
  {
    id: 'feat-1',
    name: 'Smart Grind & Brew + Pod',
    sub: 'Connected · Wi-Fi · Pod, Carafe, Grind',
    model: 'SGBP-1500',
    price: '$329',
    cat: 'gear',
    badge: 'TOP TIER',
    photo: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=900&q=85',
    url: SHOP_BASE
  },

  // BEANS — Cuisinart-partnered roasters
  { id: 'b-1', name: 'Onyx Monarch Blend',         sub: 'Ethiopia · floral · bright',          price: '$24', cat: 'beans', photo: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80', url: 'https://onyxcoffeelab.com/' },
  { id: 'b-2', name: 'Counter Culture Hologram',   sub: 'Blend · balanced · syrupy',           price: '$20', cat: 'beans', photo: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80', url: 'https://counterculturecoffee.com/' },
  { id: 'b-3', name: 'Stumptown Hair Bender',      sub: 'Espresso · classic · syrupy',         price: '$18', cat: 'beans', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.stumptowncoffee.com/' },
  { id: 'b-4', name: 'Blue Bottle Bella Donovan',  sub: 'Blend · chocolate · plum',            price: '$22', cat: 'beans', photo: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&q=80', url: 'https://bluebottlecoffee.com/' },
  { id: 'b-5', name: 'Intelligentsia Black Cat',   sub: 'Espresso · cocoa · structured',       price: '$22', cat: 'beans', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: 'https://www.intelligentsia.com/' },
  { id: 'b-6', name: 'Verve Streetlevel Espresso', sub: 'Espresso · crema-forward',            price: '$21', cat: 'beans', photo: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80', url: 'https://www.vervecoffee.com/' },

  // GEAR — actual Cuisinart coffee SKUs
  { id: 'g-1', name: 'DGB-2 Grind & Brew Single-Serve',  sub: 'Built-in grinder · single-serve',    model: 'DGB-2',      price: '$179', cat: 'gear', photo: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&q=80', url: SHOP_BASE },
  { id: 'g-2', name: 'DGB-700BC Grind & Brew 12-Cup',    sub: 'Thermal carafe · built-in burr',     model: 'DGB-700BC',  price: '$199', cat: 'gear', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: SHOP_BASE },
  { id: 'g-3', name: 'SS-15P1 Coffee Center',            sub: 'Carafe + single-serve combo',         model: 'SS-15P1',    price: '$229', cat: 'gear', photo: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80', url: SHOP_BASE },
  { id: 'g-4', name: 'EM-200 Programmable Espresso',     sub: '15-bar pump · double shot',           model: 'EM-200',     price: '$249', cat: 'gear', photo: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80', url: SHOP_BASE },
  { id: 'g-5', name: 'EM-25 Manual Espresso Maker',      sub: 'Stovetop-style · manual',             model: 'EM-25',      price: '$149', cat: 'gear', photo: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80', url: SHOP_BASE },
  { id: 'g-6', name: 'DCC-3200P1 PerfecTemp 14-Cup',     sub: 'Programmable · 14-cup glass carafe',  model: 'DCC-3200P1', price: '$99',  cat: 'gear', photo: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80', url: SHOP_BASE },
  { id: 'g-7', name: 'CCB-650 Automatic Cold Brew',      sub: 'Cold brew in 25 min · 7-cup',         model: 'CCB-650',    price: '$129', cat: 'gear', photo: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80', url: SHOP_BASE },
  { id: 'g-8', name: 'DBM-8 Supreme Grind Burr Mill',    sub: '18 grind settings · 8oz hopper',      model: 'DBM-8',      price: '$59',  cat: 'gear', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80', url: SHOP_BASE },

  // PARTS — replacement
  { id: 'p-1', name: 'Charcoal Water Filters',        sub: 'CCM-16PCFR · pack of 12 · for PerfecTemp & Grind & Brew', model: 'CCM-16PCFR', price: '$15', cat: 'parts', photo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80', url: SHOP_PARTS },
  { id: 'p-2', name: 'Glass Carafe Replacement',      sub: 'DCC-RC · 12-cup drip-free',                                model: 'DCC-RC',     price: '$28', cat: 'parts', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: SHOP_PARTS },
  { id: 'p-3', name: 'Gold-Tone Reusable Filter',     sub: 'GTF · fits 8–12 cup coffeemakers',                         model: 'GTF',        price: '$18', cat: 'parts', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: SHOP_PARTS },
  { id: 'p-4', name: 'EM-200 Portafilter Basket',     sub: 'Replacement double-shot basket',                            model: 'EM-200-BSK', price: '$22', cat: 'parts', photo: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80', url: SHOP_PARTS },
  { id: 'p-5', name: 'Thermal Carafe Replacement',    sub: 'DGB-700-CRF · 12-cup thermal',                              model: 'DGB-700-CRF',price: '$32', cat: 'parts', photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', url: SHOP_PARTS },
  { id: 'p-6', name: 'Burr Hopper Replacement',       sub: 'DBM-8-HOP · 8oz hopper',                                    model: 'DBM-8-HOP',  price: '$19', cat: 'parts', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80', url: SHOP_PARTS },

  // CLEANING — care & maintenance
  { id: 'c-1', name: 'Cuisinart Descaling Solution',    sub: '12 oz · run every 3 months',         model: 'DCC-DSCL',   price: '$12', cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80', url: SHOP_PARTS },
  { id: 'c-2', name: 'Espresso Cleaning Tablets',       sub: '40 count · for EM-200 line',         model: 'EM-CLN-40',  price: '$9',  cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', url: SHOP_PARTS },
  { id: 'c-3', name: 'Coffee Maker Cleaning Brush',     sub: 'Soft bristle · cleans grind chute',  model: 'BRSH-2',     price: '$8',  cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80', url: SHOP_PARTS },
  { id: 'c-4', name: 'Milk Frother Cleaner',            sub: 'Liquid · 8 oz · for steam wands',    model: 'EM-FRTH-CL', price: '$10', cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: SHOP_PARTS }
];

let _shopState = { cat: 'all' };

function renderShop(main) {
  // Re-renders are triggered from the filter pills themselves, so clear
  // the host first or the page accumulates duplicate copies of itself.
  if (main) main.innerHTML = '';
  const match = (typeof loadPalateMatch === 'function') ? loadPalateMatch() : null;
  const page = el('div', { class: 'bean-page bean-shop' });

  // Header
  page.appendChild(el('div', { class: 'shop-head' },
    el('h1', { class: 'shop-title' }, 'Shop'),
    el('p', { class: 'shop-sub' }, 'Specialty coffee, Cuisinart-tested gear, and the parts that keep your setup running.')
  ));

  // Palate-matched hero (only if quiz has been taken)
  if (match) {
    page.appendChild(buildPalateMatchHero(match));
  }

  // Category pills
  const pills = el('div', { class: 'shop-pills' });
  SHOP_CATEGORIES.forEach(c => {
    pills.appendChild(el('button', {
      type: 'button',
      class: 'shop-pill' + (c.key === _shopState.cat ? ' active' : ''),
      'data-cat': c.key,
      onclick: () => {
        _shopState.cat = c.key;
        renderShop(main);
      }
    }, c.label));
  });
  page.appendChild(pills);

  // Featured Cuisinart machine (always)
  const featured = SHOP_PRODUCTS.find(p => p.id === 'feat-1');
  if (featured && (_shopState.cat === 'all' || _shopState.cat === 'gear')) {
    page.appendChild(buildShopFeature(featured));
  }

  // Product grid
  const filtered = SHOP_PRODUCTS.filter(p => p.id !== 'feat-1' && (_shopState.cat === 'all' || p.cat === _shopState.cat));
  const grid = el('div', { class: 'shop-grid' });
  filtered.forEach(p => grid.appendChild(buildShopCard(p)));
  page.appendChild(grid);

  // DTC reassurance footer
  page.appendChild(el('div', { class: 'shop-foot' },
    el('div', { class: 'shop-foot-title' }, 'Direct from Cuisinart'),
    el('div', { class: 'shop-foot-sub' }, 'Free shipping on orders over $50. 3-year warranty on every smart machine. 30-day satisfaction guarantee.')
  ));

  main.appendChild(page);
}

function buildPalateMatchHero(match) {
  const card = el('div', { class: 'shop-palate' });
  card.appendChild(el('div', { class: 'shop-palate-eyebrow' }, '◆ MATCHED TO YOUR PALATE'));
  card.appendChild(el('div', { class: 'shop-palate-vibe' }, match.emoji + ' ' + match.vibe));
  card.appendChild(el('div', { class: 'shop-palate-row' },
    buildPalatePick(match.unique,     'SPECIALTY PICK'),
    buildPalatePick(match.accessible, 'EVERYDAY PICK')
  ));
  return card;
}

function buildPalatePick(pick, label) {
  return el('a', {
    class: 'shop-palate-pick',
    href: pick.url || '#',
    target: '_blank',
    rel: 'noopener noreferrer'
  },
    el('div', {
      class: 'shop-palate-pick-photo',
      style: 'background-image:url(\'' + pick.photoUrl + '\')'
    }),
    el('div', { class: 'shop-palate-pick-label' }, label),
    el('div', { class: 'shop-palate-pick-name' }, pick.name),
    el('div', { class: 'shop-palate-pick-roaster' }, pick.roaster + ' · ' + pick.price)
  );
}

function buildShopFeature(p) {
  return el('a', {
    class: 'shop-feature',
    href: p.url,
    target: '_blank',
    rel: 'noopener noreferrer'
  },
    el('div', {
      class: 'shop-feature-photo',
      style: 'background-image:url(\'' + p.photo + '\')'
    },
      el('span', { class: 'shop-feature-flag' }, p.badge || 'FEATURED')
    ),
    el('div', { class: 'shop-feature-body' },
      el('div', { class: 'shop-feature-eyebrow' }, 'CUISINART · SMART COFFEE'),
      el('div', { class: 'shop-feature-name' }, p.name),
      el('div', { class: 'shop-feature-sub' }, p.sub),
      el('div', { class: 'shop-feature-price' }, p.price)
    )
  );
}

function buildShopCard(p) {
  return el('a', {
    class: 'shop-card',
    href: p.url,
    target: '_blank',
    rel: 'noopener noreferrer'
  },
    el('div', {
      class: 'shop-card-photo',
      style: 'background-image:url(\'' + p.photo + '\')'
    },
      p.model ? el('span', { class: 'shop-card-model' }, p.model) : null
    ),
    el('div', { class: 'shop-card-body' },
      el('div', { class: 'shop-card-name' }, p.name),
      el('div', { class: 'shop-card-sub' }, p.sub),
      el('div', { class: 'shop-card-price' }, p.price)
    )
  );
}
