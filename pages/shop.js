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

const SHOP_PRODUCTS = [
  // FEATURED — palate match leads with the user's match if the quiz has run
  {
    id: 'feat-1',
    name: 'Cuisinart Smart Grind & Brew + Pod',
    sub: 'Wi-Fi, voice, three brew modes',
    price: '$329',
    cat: 'gear',
    badge: 'TOP TIER',
    photo: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=800&q=80',
    url: 'https://www.cuisinart.com/shopping/appliances/coffee_makers/'
  },
  // BEANS
  { id: 'b-1', name: 'Counter Culture Hologram', sub: 'Blend · balanced · syrupy',  price: '$20', cat: 'beans', photo: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80', url: 'https://counterculturecoffee.com/' },
  { id: 'b-2', name: 'Onyx Monarch',             sub: 'Ethiopia · floral · bright', price: '$24', cat: 'beans', photo: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80', url: 'https://onyxcoffeelab.com/' },
  { id: 'b-3', name: 'Stumptown Hair Bender',    sub: 'Espresso · classic · syrupy',price: '$18', cat: 'beans', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.stumptowncoffee.com/' },
  { id: 'b-4', name: 'Blue Bottle Bella Donovan',sub: 'Chocolate · plum · classic', price: '$22', cat: 'beans', photo: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&q=80', url: 'https://bluebottlecoffee.com/' },
  // GEAR
  { id: 'g-1', name: 'Cuisinart Burr Grind & Brew',     sub: 'Built-in conical burr',     price: '$199', cat: 'gear', photo: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&q=80', url: 'https://www.cuisinart.com/shopping/appliances/coffee_makers/' },
  { id: 'g-2', name: 'Cuisinart EM-200 Espresso',       sub: 'Programmable double shot',  price: '$249', cat: 'gear', photo: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80', url: 'https://www.cuisinart.com/shopping/appliances/coffee_makers/' },
  { id: 'g-3', name: 'Cuisinart Automatic Cold Brew',   sub: 'Cold brew in 25 min',       price: '$129', cat: 'gear', photo: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80', url: 'https://www.cuisinart.com/shopping/appliances/coffee_makers/' },
  { id: 'g-4', name: 'Fellow Stagg EKG Kettle',         sub: 'Variable temp pour-over',   price: '$169', cat: 'gear', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: 'https://fellowproducts.com/' },
  // PARTS — replacement
  { id: 'p-1', name: 'Charcoal water filter (3-pack)',   sub: 'Fits PerfecTemp & Grind & Brew', price: '$14', cat: 'parts', photo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80', url: 'https://www.cuisinart.com/' },
  { id: 'p-2', name: 'Glass carafe replacement (12-cup)', sub: 'Drip-free, dishwasher safe',     price: '$28', cat: 'parts', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: 'https://www.cuisinart.com/' },
  { id: 'p-3', name: 'Permanent gold-tone filter',        sub: 'Reusable, fits 8–12 cup',        price: '$18', cat: 'parts', photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.cuisinart.com/' },
  { id: 'p-4', name: 'Replacement portafilter basket',    sub: 'EM-200 double basket',           price: '$22', cat: 'parts', photo: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80', url: 'https://www.cuisinart.com/' },
  // CLEANING
  { id: 'c-1', name: 'Descaling solution (12 oz)',  sub: 'Run every 3 months',         price: '$12', cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80', url: 'https://www.cuisinart.com/' },
  { id: 'c-2', name: 'Espresso machine cleaning tablets', sub: '40 ct · for EM-200 line', price: '$9',  cat: 'cleaning', photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', url: 'https://www.cuisinart.com/' }
];

let _shopState = { cat: 'all' };

function renderShop(main) {
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
    }),
    el('div', { class: 'shop-card-body' },
      el('div', { class: 'shop-card-name' }, p.name),
      el('div', { class: 'shop-card-sub' }, p.sub),
      el('div', { class: 'shop-card-price' }, p.price)
    )
  );
}
