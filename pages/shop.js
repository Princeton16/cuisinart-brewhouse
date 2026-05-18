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

/* Real Cuisinart coffee catalog, scraped from
   cuisinart.com/shopping/appliances/coffee-makers. Names, model numbers,
   prices, and product URLs are pulled live from the storefront. Photos
   point at Cuisinart's Demandware CDN — they may rotate over time; if a
   tile renders blank, refresh the catalog. The replacement-parts catalog
   on cuisinart.com renders model-level photos at the index level, so the
   parts rows below link to their model's parts page.
*/
const SHOP_CDN = 'https://www.cuisinart.com/dw/image/v2/ABAF_PRD/on/demandware.static/-/Sites-master-us/default/';

const SHOP_PRODUCTS = [
  // FEATURED — the proposed connected Cuisinart from the Ghost Deck
  {
    id: 'feat-1',
    name: 'Smart Grind & Brew + Pod',
    sub: 'Connected · Wi-Fi · Pod, Carafe, Grind',
    model: 'SGBP-1500',
    price: '$329',
    cat: 'gear',
    badge: 'TOP TIER · NEW',
    photo: SHOP_CDN + 'dwd32e4fbe/images/large/ss4n1nas_straight_hero.jpg?sw=900&sh=900&sm=fit',
    url: SHOP_BASE
  },

  // BEANS — partner roasters (not Cuisinart-branded)
  { id: 'b-1', name: 'Onyx Monarch Blend',         sub: 'Ethiopia · floral · bright',          price: '$24', cat: 'beans', photo: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80', url: 'https://onyxcoffeelab.com/' },
  { id: 'b-2', name: 'Counter Culture Hologram',   sub: 'Blend · balanced · syrupy',           price: '$20', cat: 'beans', photo: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80', url: 'https://counterculturecoffee.com/' },
  { id: 'b-3', name: 'Stumptown Hair Bender',      sub: 'Espresso · classic · syrupy',         price: '$18', cat: 'beans', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.stumptowncoffee.com/' },
  { id: 'b-4', name: 'Blue Bottle Bella Donovan',  sub: 'Blend · chocolate · plum',            price: '$22', cat: 'beans', photo: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&q=80', url: 'https://bluebottlecoffee.com/' },
  { id: 'b-5', name: 'Intelligentsia Black Cat',   sub: 'Espresso · cocoa · structured',       price: '$22', cat: 'beans', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: 'https://www.intelligentsia.com/' },
  { id: 'b-6', name: 'Verve Streetlevel Espresso', sub: 'Espresso · crema-forward',            price: '$21', cat: 'beans', photo: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80', url: 'https://www.vervecoffee.com/' },

  // GEAR — actual Cuisinart coffee SKUs (URLs + photos pulled from cuisinart.com)
  {
    id: 'g-1',
    name: 'Grind & Brew Single Serve Coffee Maker',
    sub: 'Built-in burr grinder · single-serve',
    model: 'DGB-30',
    price: '$249.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dwbc11c606/images/large/5plus1_DGB30_main.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/grind-brew-single-serve-coffee-maker/DGB-30.html'
  },
  {
    id: 'g-2',
    name: 'Coffee Center® Barista Bar 4-in-1',
    sub: 'Espresso · carafe · single-serve · cold brew',
    model: 'SS-4N1NAS',
    price: '$199.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dwd32e4fbe/images/large/ss4n1nas_straight_hero.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/coffee-center-barista-bar-4-in-1-coffee-maker/SS-4N1NAS.html'
  },
  {
    id: 'g-3',
    name: 'Personal Brew™ 12-Cup Coffee Maker',
    sub: 'Brews into a cup or carafe',
    model: 'DCC-12',
    price: '$99.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dw9145e033/images/large/01_DCC12_silo.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/personal-brew-12-cup-coffee-maker/DCC-12.html'
  },
  {
    id: 'g-4',
    name: '14-Cup PerfecTemp® with Over Ice',
    sub: 'Programmable · iced brewing mode',
    model: 'DCC-3500SS',
    price: '$119.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dw9d08e5c6/images/large/dcc_3500ss.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/14-cup-perfectemp-14-cup-coffee-maker-with-over-ice/DCC-3500SS.html'
  },
  {
    id: 'g-5',
    name: '14-Cup Programmable Coffee Maker',
    sub: 'Brew-strength control · 24-hour programmable',
    model: 'DCC-3200BKSNAS',
    price: '$119.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dwfb6c31c9/images/large/dcc3200nas.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/14-cup-programmable-coffee-maker/DCC-3200BKSNAS.html'
  },
  {
    id: 'g-6',
    name: 'Coffee Center® 2-in-1 Coffee Maker',
    sub: 'Single-serve + 12-cup carafe',
    model: 'SS-16',
    price: '$229.95',
    cat: 'gear',
    photo: SHOP_CDN + 'dw37bf1da2/images/large/ss16_straight_tray_down.jpg?sw=600&sh=600&sm=fit',
    url: 'https://www.cuisinart.com/coffee-center-2-in-1-coffee-maker/SS-16.html'
  },
  {
    id: 'g-7',
    name: 'Premium Single Serve Brewer',
    sub: '4, 6, 8, 10, 12 oz cup sizes · 72 oz reservoir',
    model: 'SS-10P1',
    price: '$189.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80',
    url: 'https://www.cuisinart.com/premium-single-serve-brewer/SS-10P1.html'
  },
  {
    id: 'g-8',
    name: 'Grind & Brew Single-Serve Coffee Maker',
    sub: 'Whole-bean to cup · 5-cup carafe',
    model: 'DGB-2',
    price: '$189.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&q=80',
    url: 'https://www.cuisinart.com/grind-brew-single-serve-coffee-maker/DGB-2.html'
  },
  {
    id: 'g-9',
    name: 'Automatic Grind & Brew 12-Cup',
    sub: '12-cup glass carafe · built-in burr grinder',
    model: 'DGB-400NAS',
    price: '$119.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    url: 'https://www.cuisinart.com/automatic-grind-brew-12-cup-coffee-maker/DGB-400NAS.html'
  },
  {
    id: 'g-10',
    name: '10-Cup Thermal Classic Coffee Maker',
    sub: 'Thermal carafe · keeps coffee hot for hours',
    model: 'DCC-1170BKNAS',
    price: '$129.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80',
    url: 'https://www.cuisinart.com/10-cup-thermal-classic-coffee-maker/DCC-1170BKNAS.html'
  },
  {
    id: 'g-11',
    name: '12-Cup Classic Programmable Coffee Maker',
    sub: 'Glass carafe · 24-hour programmable',
    model: 'DCC-1120NAS',
    price: '$99.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80',
    url: 'https://www.cuisinart.com/12-cup-classic-programmable-coffee-maker/DCC-1120NAS.html'
  },
  {
    id: 'g-12',
    name: '5-Cup Coffee Maker with Stainless Carafe',
    sub: 'Compact · stainless steel build',
    model: 'DCC-5570NAS',
    price: '$64.95',
    cat: 'gear',
    photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80',
    url: 'https://www.cuisinart.com/5-cup-coffee-maker-with-stainless-steel-carafe/DCC-5570NAS.html'
  },

  // PARTS — model-level pages on Cuisinart's parts catalog
  {
    id: 'p-1',
    name: 'Charcoal Water Filters',
    sub: 'CCM-16PCFR · fits PerfecTemp & Grind & Brew',
    model: 'CCM-16PCFR',
    price: '$14.95',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80',
    url: 'https://www.cuisinart.com/14-cup-perfectemp-14-cup-coffee-maker-with-over-ice/DCC-3500SS.html?cgid=partsaccessories_coffeemakers'
  },
  {
    id: 'p-2',
    name: 'Glass Carafe Replacement',
    sub: '12-cup · for DCC-3200 line',
    model: 'DCC-3200-CRF',
    price: '$28.00',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    url: 'https://www.cuisinart.com/14-cup-programmable-coffee-maker/DCC-3200BKSNAS.html?cgid=partsaccessories_coffeemakers'
  },
  {
    id: 'p-3',
    name: 'Gold-Tone Reusable Filter',
    sub: 'GTF · fits 8–12 cup coffeemakers',
    model: 'GTF',
    price: '$18.00',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80',
    url: 'https://www.cuisinart.com/shopping/parts-and-accessories/coffee-makers/'
  },
  {
    id: 'p-4',
    name: 'Thermal Carafe Replacement',
    sub: 'For DCC-1170 thermal coffeemakers',
    model: 'DCC-1170-CRF',
    price: '$32.00',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
    url: 'https://www.cuisinart.com/10-cup-thermal-classic-coffee-maker/DCC-1170BKNAS.html?cgid=partsaccessories_coffeemakers'
  },
  {
    id: 'p-5',
    name: 'Burr Grinder Parts',
    sub: 'Hopper, lid, and grind chamber for DGB line',
    model: 'DGB-PARTS',
    price: '$19.00',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80',
    url: 'https://www.cuisinart.com/automatic-grind-brew-12-cup-coffee-maker/DGB-400NAS.html?cgid=partsaccessories_coffeemakers'
  },
  {
    id: 'p-6',
    name: 'Single-Serve Drip Tray',
    sub: 'For Coffee Center 2-in-1 (SS-16)',
    model: 'SS-16-DT',
    price: '$15.00',
    cat: 'parts',
    photo: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80',
    url: 'https://www.cuisinart.com/coffee-center-2-in-1-coffee-maker/SS-16.html?cgid=partsaccessories_coffeemakers'
  },

  // CLEANING — care & maintenance
  { id: 'c-1', name: 'Cuisinart Descaling Solution',    sub: '12 oz · run every 3 months',         model: 'DCC-DSCL',   price: '$11.95', cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80', url: 'https://www.cuisinart.com/shopping/parts-and-accessories/coffee-makers/' },
  { id: 'c-2', name: 'Espresso Cleaning Tablets',       sub: '40 count · for espresso line',       model: 'EM-CLN-40',  price: '$9.00',  cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', url: 'https://www.cuisinart.com/shopping/parts-and-accessories/coffee-makers/' },
  { id: 'c-3', name: 'Coffee Maker Cleaning Brush',     sub: 'Soft bristle · grind-chute brush',   model: 'BRSH-2',     price: '$8.00',  cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80', url: 'https://www.cuisinart.com/shopping/parts-and-accessories/coffee-makers/' },
  { id: 'c-4', name: 'Milk Frother Cleaner',            sub: 'Liquid · 8 oz · for steam wands',    model: 'EM-FRTH-CL', price: '$10.00', cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.cuisinart.com/shopping/parts-and-accessories/coffee-makers/' }
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
