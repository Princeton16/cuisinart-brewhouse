/* ============================================================
   Brew Lab — Mock Data
   Drawn from the Cuisinart coffee category and competitor
   landscape. Replace with real CMS data in production.
   ============================================================ */

const DATA = {

  /* ---------------- Brew methods (machine-agnostic) ---------------- */
  machines: [
    { id: 'drip-auto', name: 'Drip / automatic brewer', kind: 'Drip', icon: '☕', blurb: 'Standard 8-12 cup automatic. The most common home setup.', bestFor: ['drip', 'cold brew'] },
    { id: 'espresso-machine', name: 'Espresso machine', kind: 'Espresso', icon: '🫘', blurb: 'Pump espresso with a steam wand. The all-rounder for milk drinks and shots.', bestFor: ['espresso', 'cappuccino', 'latte'] },
    { id: 'pour-over', name: 'Pour over', kind: 'Manual', icon: '🌊', blurb: 'V60, Kalita, Origami, or any cone. Manual control, third-wave classic.', bestFor: ['pour over'] },
    { id: 'french-press', name: 'French press', kind: 'Immersion', icon: '💪', blurb: 'Full immersion. Bold body. The starter brewer most people own.', bestFor: ['french press'] },
    { id: 'pod', name: 'Single-serve pods', kind: 'Pod', icon: '⚡', blurb: 'Keurig, Nespresso, or similar. Fast and consistent.', bestFor: ['pod'] },
    { id: 'cold-brew', name: 'Cold brew', kind: 'Cold brew', icon: '🧊', blurb: 'Slow steep or rapid extraction. Low acid, smooth.', bestFor: ['cold brew'] },
    { id: 'aeropress', name: 'AeroPress', kind: 'Pressure-immersion', icon: '🎯', blurb: 'Hybrid pressure and immersion. Forgiving and travel-friendly.', bestFor: ['aeropress'] }
  ],

  /* ---------------- Roasters / Beans (curated, global) ---------------- */
  /* Photos use loremflickr.com — public service that serves Creative Commons photos
     from Flickr by keyword. Replace `photo:` URLs with your own files in /images/ later. */
  beans: [
    { id: 'onyx-monarch', name: 'Onyx Monarch Blend', roaster: 'Onyx Coffee Lab', origin: 'Ethiopia + Colombia', originRef: 'ethiopia', roast: 'Medium', tags: ['fruity', 'sweet', 'balanced'], icon: '🍫', photo: 'https://loremflickr.com/800/600/coffee,beans,bag?lock=11', flavors: ['Milk chocolate', 'Strawberry', 'Honey'], rating: 4.7, brewedBy: 12340, notes: 'A staple blend that anchors many home setups.' },
    { id: 'counter-hologram', name: 'Counter Culture Hologram', roaster: 'Counter Culture Coffee', origin: 'Latin America', originRef: 'colombia', roast: 'Medium-light', tags: ['balanced', 'sweet', 'classic'], icon: '✨', photo: 'https://loremflickr.com/800/600/coffee,roasting?lock=12', flavors: ['Caramel', 'Almond', 'Apple'], rating: 4.6, brewedBy: 9180, notes: 'A cleanly-roasted Latin American blend.' },
    { id: 'blue-bottle-bella', name: 'Blue Bottle Bella Donovan', roaster: 'Blue Bottle Coffee', origin: 'Africa + Indonesia', originRef: 'sumatra', roast: 'Medium-dark', tags: ['rich', 'bold', 'chocolatey'], icon: '🌀', photo: 'https://loremflickr.com/800/600/coffee,dark?lock=13', flavors: ['Dark chocolate', 'Plum', 'Toasted oak'], rating: 4.5, brewedBy: 7820, notes: 'Weighty and chocolatey, holds up to milk drinks.' },
    { id: 'trade-light', name: 'Trade Light & Lively', roaster: 'Trade Coffee', origin: 'Curated rotating', originRef: 'kenya', roast: 'Light', tags: ['bright', 'fruity', 'tea-like'], icon: '🌿', photo: 'https://loremflickr.com/800/600/coffee,light?lock=14', flavors: ['Jasmine', 'Lemon', 'Berries'], rating: 4.4, brewedBy: 5410, notes: 'Light roast curation, fruit-forward African coffees.' },
    { id: 'atlas-curated', name: 'Atlas Subscription Pick', roaster: 'Atlas Coffee Club', origin: 'Single origin, rotating', originRef: 'guatemala', roast: 'Medium', tags: ['adventure', 'single origin'], icon: '🌍', photo: 'https://loremflickr.com/800/600/coffee,bag?lock=15', flavors: ['Varies by month'], rating: 4.3, brewedBy: 4250, notes: 'Rotating single origins.' },
    { id: 'kona-direct', name: 'Hawaiian Kona Estate', roaster: 'Kona Direct', origin: 'Hawaii, United States', originRef: 'hawaii', roast: 'Medium', tags: ['rare', 'smooth', 'mellow'], icon: '🌺', photo: 'https://loremflickr.com/800/600/coffee,plantation?lock=16', flavors: ['Brown sugar', 'Macadamia', 'Vanilla'], rating: 4.8, brewedBy: 1820, notes: 'Rare and expensive. Mellow, with a clean finish.' },
    { id: 'yemen-mokha', name: 'Yemeni Mokha Matari', roaster: 'Mokha Bunn', origin: 'Yemen', originRef: 'yemen', roast: 'Medium', tags: ['rare', 'complex', 'wild'], icon: '🏔️', photo: 'https://loremflickr.com/800/600/coffee,arabica?lock=17', flavors: ['Cardamom', 'Dark berry', 'Wine'], rating: 4.6, brewedBy: 980, notes: 'The original coffee. Wild, complex, unmistakable.' },
    { id: 'jamaican-blue', name: 'Jamaican Blue Mountain', roaster: 'Wallenford Estate', origin: 'Jamaica', originRef: 'jamaica', roast: 'Medium', tags: ['rare', 'balanced', 'smooth'], icon: '🏝️', photo: 'https://loremflickr.com/800/600/coffee,mountain?lock=18', flavors: ['Mild', 'Floral', 'Clean'], rating: 4.7, brewedBy: 1240, notes: 'Among the worlds rarest. Bright, balanced, and clean.' },
    { id: 'sumatra-mandheling', name: 'Sumatra Mandheling', roaster: 'Stumptown', origin: 'Indonesia', originRef: 'sumatra', roast: 'Dark', tags: ['earthy', 'bold', 'chocolatey'], icon: '🌑', photo: 'https://loremflickr.com/800/600/coffee,beans?lock=19', flavors: ['Dark cocoa', 'Cedar', 'Tobacco'], rating: 4.4, brewedBy: 6820, notes: 'Heavy body, low acidity, earthy.' },
    { id: 'kenyan-aa', name: 'Kenyan AA Nyeri', roaster: 'Tegu Estate', origin: 'Kenya', originRef: 'kenya', roast: 'Light', tags: ['bright', 'fruity', 'wine-like'], icon: '⚡', photo: 'https://loremflickr.com/800/600/coffee,kenya?lock=20', flavors: ['Blackcurrant', 'Tomato', 'Citrus'], rating: 4.7, brewedBy: 3940, notes: 'High-grown Kenyan AA. Bright, vibrant, structured.' },
    { id: 'costa-rica-tarrazu', name: 'Costa Rican Tarrazú', roaster: 'Hacienda La Minita', origin: 'Costa Rica', originRef: 'costa-rica', roast: 'Medium', tags: ['balanced', 'clean', 'sweet'], icon: '🌅', photo: 'https://loremflickr.com/800/600/coffee,farm?lock=21', flavors: ['Apple', 'Honey', 'Almond'], rating: 4.5, brewedBy: 4720, notes: 'Bright, clean, and consistent.' },
    { id: 'brazilian-santos', name: 'Brazilian Santos', roaster: 'Daterra', origin: 'Brazil', originRef: 'brazil', roast: 'Medium-dark', tags: ['nutty', 'low-acid', 'classic'], icon: '🌰', photo: 'https://loremflickr.com/800/600/coffee,brazil?lock=22', flavors: ['Hazelnut', 'Caramel', 'Chocolate'], rating: 4.3, brewedBy: 8920, notes: 'Low acid, nutty body. The foundation of most espresso blends.' }
  ],

  /* ---------------- Cuisinart / Conair products ---------------- */
  products: [
    { id: 'dgb-2', name: 'Grind & Brew Coffeemaker', model: 'DGB-2', category: 'Coffee maker', icon: '☕', photo: 'https://loremflickr.com/800/600/coffeemaker?lock=41', bg: 'linear-gradient(135deg, #2A1A14 0%, #3D2418 100%)', tagline: 'Built-in burr grinder. 12 cups.', desc: 'Grinds beans on demand and brews automatically. Programmable timer for waking up to fresh coffee.', tags: ['drip', 'grinder', '12-cup'], owners: 18420 },
    { id: 'em-15', name: 'Espresso Maker', model: 'EM-15', category: 'Espresso', icon: '🫘', photo: 'https://loremflickr.com/800/600/espresso,machine?lock=42', bg: 'linear-gradient(135deg, #2D4A3A 0%, #1d3327 100%)', tagline: '15-bar pump. Steam wand.', desc: 'Cafe-style espresso at home. Manual steam wand for milk drinks and latte art practice.', tags: ['espresso', 'milk drinks'], owners: 9240 },
    { id: 'dcc-3200', name: 'PerfecTemp Coffeemaker', model: 'DCC-3200', category: 'Coffee maker', icon: '☕', photo: 'https://loremflickr.com/800/600/coffeemaker,kitchen?lock=43', bg: 'linear-gradient(135deg, #C8762D 0%, #A85F1F 100%)', tagline: '14-cup. Brewing temp control.', desc: 'Adjustable brew temperature lets you tune extraction to your beans. Brew strength control.', tags: ['drip', '14-cup'], owners: 24180 },
    { id: 'dcb-10', name: 'Automatic Cold Brew', model: 'DCB-10', category: 'Cold brew', icon: '🧊', photo: 'https://loremflickr.com/800/600/coldbrew,coffee?lock=44', bg: 'linear-gradient(135deg, #5476A6 0%, #2c4869 100%)', tagline: 'Cold brew in 25 minutes.', desc: 'Spins grounds through cold water for rapid extraction. Concentrate or full-strength.', tags: ['cold brew'], owners: 7820 },
    { id: 'cpo-800', name: 'PurePrecision Pour Over', model: 'CPO-800', category: 'Pour over', icon: '🌊', photo: 'https://loremflickr.com/800/600/pourover,coffee?lock=45', bg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', tagline: 'Automated pour over. 8 cups.', desc: 'Variable pulse and pour timing. Replicates the manual pour over technique automatically.', tags: ['pour over', '8-cup'], owners: 4120 },
    { id: 'fp-3', name: 'Classic French Press', model: 'FP-3', category: 'French press', icon: '💪', photo: 'https://loremflickr.com/800/600/frenchpress?lock=46', bg: 'linear-gradient(135deg, #4A3A30 0%, #2A1A14 100%)', tagline: '32oz. Stainless mesh.', desc: 'Double-walled stainless. Keeps coffee hot. Mesh filter for full body.', tags: ['french press'], owners: 12480 },
    { id: 'dbm-8', name: 'Burr Mill Grinder', model: 'DBM-8', category: 'Grinder', icon: '⚙️', photo: 'https://loremflickr.com/800/600/coffee,grinder?lock=47', bg: 'linear-gradient(135deg, #6B5D54 0%, #3D2418 100%)', tagline: '18 grind settings.', desc: 'Burr grinding from espresso fine to French press coarse. Removable hopper for clean storage.', tags: ['grinder'], owners: 14820 },
    { id: 'em-350', name: 'Touchscreen Espresso', model: 'EM-350', category: 'Espresso', icon: '📱', photo: 'https://loremflickr.com/800/600/espresso,latte?lock=48', bg: 'linear-gradient(135deg, #C8762D 0%, #2A1A14 100%)', tagline: 'Touchscreen. Auto milk frother.', desc: 'One-touch espresso, latte, cappuccino. Built-in milk frother. The all-in-one.', tags: ['espresso', 'automatic'], owners: 5680 }
  ],

  /* ---------------- Coffee Passport regions ---------------- */
  /* Stamps the user collects by trying beans from each origin */
  passportRegions: [
    { id: 'ethiopia', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa' },
    { id: 'kenya', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
    { id: 'rwanda', name: 'Rwanda', flag: '🇷🇼', region: 'Africa' },
    { id: 'yemen', name: 'Yemen', flag: '🇾🇪', region: 'Middle East' },
    { id: 'colombia', name: 'Colombia', flag: '🇨🇴', region: 'South America' },
    { id: 'brazil', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
    { id: 'guatemala', name: 'Guatemala', flag: '🇬🇹', region: 'Central America' },
    { id: 'costa-rica', name: 'Costa Rica', flag: '🇨🇷', region: 'Central America' },
    { id: 'jamaica', name: 'Jamaica', flag: '🇯🇲', region: 'Caribbean' },
    { id: 'hawaii', name: 'Hawaii', flag: '🌺', region: 'Pacific' },
    { id: 'sumatra', name: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific' },
    { id: 'vietnam', name: 'Vietnam', flag: '🇻🇳', region: 'Asia Pacific' }
  ],

  /* ---------------- Daily quests (rotating) ---------------- */
  dailyQuests: [
    { id: 'q1', icon: '☕', title: 'Brew and rate', desc: 'Log a brew with a tasting note today', reward: 30 },
    { id: 'q2', icon: '🌍', title: 'Try a new origin', desc: 'Brew a bean from an origin you have never tried', reward: 50 },
    { id: 'q3', icon: '🎬', title: 'Watch and learn', desc: 'Watch one creator video', reward: 20 },
    { id: 'q4', icon: '💬', title: 'Ask the Barista', desc: 'Ask one question to the Virtual Barista', reward: 15 },
    { id: 'q5', icon: '🎨', title: 'Vote on a pour', desc: 'Vote on a Latte Art Leaderboard submission', reward: 10 },
    { id: 'q6', icon: '📚', title: 'Continue your class', desc: 'Spend at least one lesson on any class', reward: 25 }
  ],

  /* ---------------- Brew personalities (assigned based on profile) ---------------- */
  brewPersonalities: [
    { id: 'methodical', name: 'The Methodical Barista', icon: '⚖️', desc: 'Weighs beans, times shots, owns a refractometer. Coffee is a craft to perfect.' },
    { id: 'explorer', name: 'The Adventurous Explorer', icon: '🌍', desc: 'Tries every new origin. Bored of the same bean two weeks in a row.' },
    { id: 'creator', name: 'The Cafe Creator', icon: '🎨', desc: 'Latte art, syrups, drinks they invented. Coffee is creative expression.' },
    { id: 'purist', name: 'The Purist', icon: '⚫', desc: 'Black coffee, light roast, pour over. Lets the bean speak for itself.' },
    { id: 'comfort', name: 'The Comfort Drinker', icon: '🛋️', desc: 'Same brew every morning. The ritual matters more than the variety.' },
    { id: 'social', name: 'The Cafe Social', icon: '☕', desc: 'Coffee is connection. Loves the third place as much as the cup.' }
  ],

  /* ---------------- Community awards (rotating monthly) ---------------- */
  communityAwards: [
    { id: 'best-journal', icon: '📓', title: 'Brewer of the Month', winner: 'Maya R.', desc: 'For 31 consecutive days of brews logged with detailed tasting notes.', month: 'April 2026' },
    { id: 'most-helpful', icon: '🤝', title: 'Most Helpful', winner: 'Diego P.', desc: 'Answered 47 questions in the community feed this month.', month: 'April 2026' },
    { id: 'pour-champ', icon: '🎨', title: 'Latte Art Champ', winner: 'Tessa L.', desc: 'Won three weekly leaderboards in a row with her rosetta variations.', month: 'April 2026' },
    { id: 'origin-quest', icon: '🌍', title: 'Coffee Passport Master', winner: 'Priya S.', desc: 'First member to collect stamps from all 12 origins this year.', month: 'April 2026' },
    { id: 'rising-star', icon: '🌟', title: 'Rising Star', winner: 'Marcus B.', desc: 'Reached Specialty Brewer in 60 days. Fastest of the month.', month: 'April 2026' }
  ],

  /* ---------------- Mock community members (for friends + leaderboard) ---------------- */
  /* In production these would come from a real social graph. */
  members: [
    { id: 'maya-r', name: 'Maya R.', handle: '@maya.brews', initials: 'MR', tier: 'specialty', tierIcon: '🌊', points: 4830, streak: 28, brews: 312, location: 'Portland, Oregon', personality: 'methodical', bio: 'Pour over obsessed. V60 evangelist.', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #A85F1F 100%)', recentBrew: 'Onyx Monarch · V60' },
    { id: 'diego-p', name: 'Diego P.', handle: '@diego.pulls', initials: 'DP', tier: 'specialty', tierIcon: '🌊', points: 4210, streak: 41, brews: 298, location: 'Mexico City', personality: 'creator', bio: 'Latte art every morning. Try my hibiscus syrup.', avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #1d3327 100%)', recentBrew: 'Hibiscus latte · espresso' },
    { id: 'priya-s', name: 'Priya S.', handle: '@priya.passport', initials: 'PS', tier: 'connoisseur', tierIcon: '🎯', points: 3905, streak: 67, brews: 421, location: 'London, United Kingdom', personality: 'explorer', bio: 'First in the community to collect all 12 origin stamps.', avatarBg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', recentBrew: 'Yemeni Mokha · pour over' },
    { id: 'alex-t', name: 'Alex T.', handle: '@alex.morning', initials: 'AT', tier: 'home-barista', tierIcon: '☕', points: 3120, streak: 14, brews: 187, location: 'Brooklyn, New York', personality: 'comfort', bio: 'Same machine every morning. No notes.', avatarBg: 'linear-gradient(135deg, #5476A6 0%, #2c4869 100%)', recentBrew: 'Counter Culture · drip' },
    { id: 'sam-k', name: 'Sam K.', handle: '@sam.steams', initials: 'SK', tier: 'home-barista', tierIcon: '☕', points: 2890, streak: 8, brews: 142, location: 'Toronto, Ontario', personality: 'creator', bio: 'Day 14 of 30 Days of Latte Art. Hearts holding steady.', avatarBg: 'linear-gradient(135deg, #4A3A30 0%, #2A1A14 100%)', recentBrew: 'Cappuccino · espresso' },
    { id: 'jordan-w', name: 'Jordan W.', handle: '@jordan.cafe', initials: 'JW', tier: 'home-barista', tierIcon: '☕', points: 2540, streak: 21, brews: 156, location: 'Austin, Texas', personality: 'social', bio: 'Coffee shop tour videos. Brooklyn next month.', avatarBg: 'linear-gradient(135deg, #6B5D54 0%, #3D2418 100%)', recentBrew: 'Iced flat white' },
    { id: 'tessa-l', name: 'Tessa L.', handle: '@tessa.pours', initials: 'TL', tier: 'specialty', tierIcon: '🌊', points: 3680, streak: 32, brews: 224, location: 'Berlin, Germany', personality: 'creator', bio: '12-leaf rosetta queen. Three weekly leaderboards.', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #2A1A14 100%)', recentBrew: 'Rosetta latte · espresso' },
    { id: 'marcus-b', name: 'Marcus B.', handle: '@marcus.learns', initials: 'MB', tier: 'apprentice', tierIcon: '🌱', points: 1840, streak: 4, brews: 38, location: 'Chicago, Illinois', personality: 'methodical', bio: 'Just got my first espresso machine. Learning fast.', avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #C5962B 100%)', recentBrew: 'Espresso · dialing in' },
    { id: 'naomi-k', name: 'Naomi K.', handle: '@naomi.purist', initials: 'NK', tier: 'home-barista', tierIcon: '☕', points: 2280, streak: 19, brews: 124, location: 'Tokyo, Japan', personality: 'purist', bio: 'Light roast pour over. Black, always.', avatarBg: 'linear-gradient(135deg, #1F1410 0%, #4A3A30 100%)', recentBrew: 'Trade Light · V60' },
    { id: 'rafael-h', name: 'Rafael H.', handle: '@rafa.press', initials: 'RH', tier: 'apprentice', tierIcon: '🌱', points: 920, streak: 2, brews: 22, location: 'São Paulo, Brazil', personality: 'comfort', bio: 'New to specialty coffee. Big French press fan.', avatarBg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', recentBrew: 'Brazilian · French press' }
  ],

  /* ---------------- Skill tree structure ---------------- */
  /* Visual progression: each node is a class. Tier branches converge to Sommelier. */
  skillTree: {
    branches: [
      {
        id: 'foundations',
        name: 'Foundations',
        color: 'caramel',
        nodes: ['milk-steaming', 'espresso-fundamentals']
      },
      {
        id: 'craft',
        name: 'Craft',
        color: 'green',
        nodes: ['latte-art-101', 'pour-over-mastery']
      },
      {
        id: 'mastery',
        name: 'Mastery',
        color: 'gold',
        nodes: ['cupping', 'latte-art-201']
      }
    ]
  },

  /* ---------------- Origins / Farmer profiles ---------------- */
  origins: [
    {
      id: 'ethiopia',
      country: 'Ethiopia',
      region: 'Yirgacheffe',
      x: 56, y: 56,
      farmer: 'Asefa Dukamo',
      farmName: 'Daye Bensa Cooperative',
      photoIcon: '🇪🇹',
      bio: 'Asefa runs a 220-member cooperative in the highlands of Yirgacheffe. Daye Bensa has invested in shared washing stations and is one of the first in the region to publish farmer-level traceability.',
      altitude: '1,950m',
      varietal: 'Heirloom',
      processing: 'Washed',
      story: 'We picked Asefa because of the floral, tea-like cup his washed lots produce, and because his farmers receive 28% above the C-market price.',
      videoTitle: 'A morning at Daye Bensa',
      videoDuration: '4:12',
      partners: ['Onyx Coffee Lab', 'Blue Bottle']
    },
    {
      id: 'colombia',
      country: 'Colombia',
      region: 'Huila',
      x: 26, y: 64,
      farmer: 'Elkin Guzmán',
      farmName: 'Finca El Mirador',
      photoIcon: '🇨🇴',
      bio: 'Elkin is a third-generation farmer experimenting with anaerobic and honey processing on a 12-hectare farm at 1,750m. Cup of Excellence finalist three years running.',
      altitude: '1,750m',
      varietal: 'Pink Bourbon, Geisha',
      processing: 'Anaerobic honey',
      story: 'Elkin pushed the boundary on what Colombian coffee can taste like. His Pink Bourbon scored 91 last year.',
      videoTitle: 'Process experiments at El Mirador',
      videoDuration: '6:30',
      partners: ['Counter Culture', 'Trade Coffee']
    },
    {
      id: 'kenya',
      country: 'Kenya',
      region: 'Nyeri',
      x: 58, y: 60,
      farmer: 'Wanjiku Mwangi',
      farmName: 'Tegu Estate',
      photoIcon: '🇰🇪',
      bio: 'Wanjiku took over Tegu Estate from her father in 2019 and is the only female-led estate in Nyeri to consistently export to specialty roasters in the US and Japan.',
      altitude: '1,820m',
      varietal: 'SL28, SL34',
      processing: 'Fully washed',
      story: 'Tegu is the source for that bright, blackcurrant-and-tomato cup that defines great Kenyan coffee.',
      videoTitle: 'Why Kenya tastes like Kenya',
      videoDuration: '5:45',
      partners: ['Trade Coffee', 'Onyx Coffee Lab']
    },
    {
      id: 'guatemala',
      country: 'Guatemala',
      region: 'Huehuetenango',
      x: 22, y: 56,
      farmer: 'Carlos Hernández',
      farmName: 'Finca La Folie',
      photoIcon: '🇬🇹',
      bio: 'Carlos farms a small 5-hectare plot at 1,650m. Hand-picks every cherry. Has a second job as a high school chemistry teacher.',
      altitude: '1,650m',
      varietal: 'Caturra, Catuai',
      processing: 'Washed',
      story: 'A complete cup. Caramel and apple sweetness with enough body to stand up to milk.',
      videoTitle: 'Hand-pick: a day in Huehue',
      videoDuration: '3:50',
      partners: ['Atlas Coffee Club', 'Counter Culture']
    },
    {
      id: 'brazil',
      country: 'Brazil',
      region: 'Sul de Minas',
      x: 32, y: 70,
      farmer: 'Maria Souza',
      farmName: 'Fazenda Santa Inês',
      photoIcon: '🇧🇷',
      bio: 'Maria oversees 80 hectares with a focus on natural and pulped natural processing. Family farm since 1958.',
      altitude: '1,250m',
      varietal: 'Yellow Bourbon, Catuai',
      processing: 'Natural',
      story: 'The classic Brazilian cup. Chocolate, nuts, low acidity. Why your morning espresso has body.',
      videoTitle: 'Why Brazil is the foundation',
      videoDuration: '4:40',
      partners: ['Blue Bottle', 'Counter Culture']
    },
    {
      id: 'rwanda',
      country: 'Rwanda',
      region: 'Nyamasheke',
      x: 56, y: 64,
      farmer: 'Innocent Habimana',
      farmName: 'Cyato Washing Station',
      photoIcon: '🇷🇼',
      bio: 'Innocent manages a washing station that serves 380 smallholder farmers. Built post-genocide as a cooperative recovery project.',
      altitude: '1,900m',
      varietal: 'Bourbon',
      processing: 'Washed, double fermented',
      story: 'Sweet, clean, with red apple and a tea-like finish. Rwanda is having a moment.',
      videoTitle: 'A washing station rebuilt',
      videoDuration: '7:20',
      partners: ['Counter Culture']
    },
    {
      id: 'sumatra',
      country: 'Indonesia',
      region: 'Sumatra, Aceh',
      x: 80, y: 64,
      farmer: 'Pak Iwan Setiawan',
      farmName: 'Gayo Highlands Coop',
      photoIcon: '🇮🇩',
      bio: 'Pak Iwan represents 1,200 farmers in the Gayo highlands. Wet-hulled processing produces the signature earthy, body-heavy cup.',
      altitude: '1,500m',
      varietal: 'Typica, Tim Tim',
      processing: 'Wet-hulled (Giling Basah)',
      story: 'That deep, earthy, syrupy cup that anchors most dark roast blends.',
      videoTitle: 'Wet-hulled: the Sumatran method',
      videoDuration: '5:10',
      partners: ['Blue Bottle', 'Stumptown']
    },
    {
      id: 'hawaii',
      country: 'United States',
      region: 'Kona, Hawaii',
      x: 14, y: 56,
      farmer: 'Ku\'ulei Nakamura',
      farmName: 'Mauna Loa Estate',
      photoIcon: '🌺',
      bio: 'Ku\'ulei works a 6-acre Kona estate on volcanic slopes. The only US-grown specialty coffee with global recognition.',
      altitude: '600m',
      varietal: 'Typica',
      processing: 'Washed',
      story: 'Smooth, mellow, with brown sugar and macadamia. The most accessible cup in our lineup.',
      videoTitle: 'Coffee on a volcano',
      videoDuration: '4:30',
      partners: ['Kona Direct']
    },
    {
      id: 'yemen',
      country: 'Yemen',
      region: 'Bani Matar, Mokha',
      x: 60, y: 56,
      farmer: 'Mokhtar Alkhanshali',
      farmName: 'Mokha Bunn',
      photoIcon: '🏔️',
      bio: 'Mokhtar revived Yemeni coffee single-handedly, smuggling samples out during conflict to bring Yemeni Mokha back to global markets.',
      altitude: '2,200m',
      varietal: 'Heirloom (the original)',
      processing: 'Natural',
      story: 'The historic origin. Wild, complex, unmistakable. Cardamom, dark berry, wine.',
      videoTitle: 'Saving Yemeni coffee',
      videoDuration: '8:00',
      partners: ['Mokha Bunn']
    },
    {
      id: 'jamaica',
      country: 'Jamaica',
      region: 'Blue Mountains',
      x: 22, y: 58,
      farmer: 'Dorothy Wallace',
      farmName: 'Wallenford Estate',
      photoIcon: '🏝️',
      bio: 'Wallenford Estate has grown Blue Mountain coffee since 1880. Among the worlds most expensive and most regulated coffees.',
      altitude: '1,500m',
      varietal: 'Typica',
      processing: 'Washed',
      story: 'Bright, balanced, clean. Why Blue Mountain commands its price.',
      videoTitle: 'Blue Mountain: protected origin',
      videoDuration: '5:50',
      partners: ['Wallenford Estate']
    },
    {
      id: 'costa-rica',
      country: 'Costa Rica',
      region: 'Tarrazú',
      x: 24, y: 60,
      farmer: 'Roberto Vargas',
      farmName: 'Hacienda La Minita',
      photoIcon: '🇨🇷',
      bio: 'La Minita has been a benchmark for Costa Rican coffee for over a century. Strict varietal control and selective picking.',
      altitude: '1,700m',
      varietal: 'Catuai, Caturra',
      processing: 'Washed',
      story: 'Bright, clean, balanced. The reliable cup. Apple, honey, almond.',
      videoTitle: 'A century of consistency',
      videoDuration: '4:20',
      partners: ['Hacienda La Minita']
    },
    {
      id: 'vietnam',
      country: 'Vietnam',
      region: 'Da Lat, Lam Dong',
      x: 78, y: 60,
      farmer: 'Nguyen Thi Lan',
      farmName: 'Da Lat Highlands',
      photoIcon: '🇻🇳',
      bio: 'Nguyen Thi Lan farms specialty arabica in Da Lat, working to shift Vietnam\'s reputation from commodity robusta to specialty.',
      altitude: '1,500m',
      varietal: 'Bourbon, Catimor',
      processing: 'Honey, washed',
      story: 'The next frontier. Vietnam is no longer just instant coffee. The new specialty origin to watch.',
      videoTitle: 'Vietnam goes specialty',
      videoDuration: '6:10',
      partners: ['Da Lat Highlands']
    }
  ],

  /* ---------------- Recipes ---------------- */
  recipes: [
    {
      id: 'morning-classic',
      name: 'The Morning Classic',
      machineCompat: ['drip-auto', 'pod'],
      method: 'Drip',
      icon: '☀️',
      photo: 'https://loremflickr.com/800/600/coffee,morning,cup?lock=31',
      thumbClass: 'tile-thumb',
      time: '6 min',
      difficulty: 'Easy',
      tags: ['drip', 'balanced', 'every day'],
      author: 'Cuisinart Test Kitchen',
      desc: 'A balanced cup that lets the bean speak. The everyday drip formula every home brewer should know by heart.',
      ratio: '1:16',
      dose: '60g coffee / 950ml water',
      grind: 'Medium',
      water: '200°F (93°C)',
      steps: [
        { title: 'Grind fresh', body: 'Medium grind, slightly coarser than table salt. Grind only what you need.', time: '30 sec' },
        { title: 'Charge the reservoir', body: 'Filtered water at 200°F. Many drip machines hover around this naturally.', time: '1 min' },
        { title: 'Bloom', body: 'If your machine has a pre-infusion mode, use it. Look for the grounds to puff up.', time: '30 sec' },
        { title: 'Brew', body: 'Total brew time should land between 4:30 and 5:30. Pour into a pre-warmed mug as soon as possible.', time: '4-5 min' },
        { title: 'Decant', body: 'Skip the carafe sit if you can. Coffee tastes best within 15 minutes of brewing.', time: '15 sec' }
      ]
    },
    {
      id: 'sat-morning-latte',
      name: 'Saturday Morning Latte',
      machineCompat: ['espresso-machine'],
      method: 'Espresso',
      icon: '🥛',
      photo: 'https://loremflickr.com/800/600/latte,art?lock=32',
      thumbClass: 'tile-thumb-dark',
      time: '4 min',
      difficulty: 'Medium',
      tags: ['espresso', 'milk', 'weekend'],
      author: 'Lance H. (Brew Lab Creator)',
      desc: 'Café-quality latte at home. Espresso shot, steamed milk, simple pour.',
      ratio: '1:2 espresso, 1:5 milk',
      dose: '18g in / 36g out',
      grind: 'Fine',
      water: 'Espresso pre-set',
      steps: [
        { title: 'Pull a double', body: '18g of medium-dark beans, fine grind, 36g out in 27-32 seconds.', time: '32 sec' },
        { title: 'Steam your milk', body: 'Whole or oat milk. Wand 1cm below surface, stretch for 3-4 seconds to introduce air, then submerge to 2cm and roll.', time: '40 sec' },
        { title: 'Tap and swirl', body: 'Tap the pitcher hard once to break large bubbles. Swirl until glossy.', time: '5 sec' },
        { title: 'Pour', body: 'Start high to push espresso to one side, then drop close and wiggle for a leaf or heart.', time: '20 sec' }
      ]
    },
    {
      id: 'cold-brew-classic',
      name: 'Slow Cold Brew Concentrate',
      machineCompat: ['cold-brew', 'french-press'],
      method: 'Cold brew',
      icon: '🧊',
      photo: 'https://loremflickr.com/800/600/iced,coffee?lock=33',
      thumbClass: 'tile-thumb-green',
      time: '20 hr',
      difficulty: 'Easy',
      tags: ['cold brew', 'summer', 'concentrate'],
      author: 'Brew Lab Team',
      desc: 'Smooth, low-acid cold brew. Concentrate at 1:8 to dilute or pour over ice.',
      ratio: '1:8 (concentrate)',
      dose: '120g coffee / 960ml water',
      grind: 'Coarse',
      water: 'Cold filtered',
      steps: [
        { title: 'Coarse grind', body: 'Coarser than French press. Looks like raw sugar.', time: '1 min' },
        { title: 'Combine', body: 'Add grounds, then water. Stir to ensure full saturation.', time: '30 sec' },
        { title: 'Steep', body: 'Refrigerator for 18-24 hours. Sweet spot is 20 hours.', time: '20 hr' },
        { title: 'Filter', body: 'Press out through paper filter for clarity.', time: '3 min' },
        { title: 'Serve', body: 'Dilute 1:1 with water or milk over ice.', time: '15 sec' }
      ]
    },
    {
      id: 'pour-over-light',
      name: 'Pour Over for Light Roasts',
      machineCompat: ['pour-over'],
      method: 'Pour over',
      icon: '🌊',
      photo: 'https://loremflickr.com/800/600/pourover,coffee?lock=34',
      thumbClass: 'tile-thumb',
      time: '5 min',
      difficulty: 'Hard',
      tags: ['pour over', 'light roast', 'hands on'],
      author: 'James H. (Brew Lab Creator)',
      desc: 'A high-extraction pour for fruit-forward light roasts. Works on any V60 or cone.',
      ratio: '1:17',
      dose: '20g coffee / 340ml water',
      grind: 'Medium-fine',
      water: '205°F (96°C)',
      steps: [
        { title: 'Rinse the filter', body: 'Pre-wet the V60 filter and discard the rinse water. Removes paper taste and pre-heats the brewer.', time: '20 sec' },
        { title: 'Bloom pour', body: '40g of water in a circular motion. Wait 30 seconds.', time: '45 sec' },
        { title: 'First main pour', body: '160g over 30 seconds in slow concentric circles. Aim for 200g total in the brewer.', time: '30 sec' },
        { title: 'Second main pour', body: '140g over 30 seconds. Total volume 340g, total time around 3:00.', time: '30 sec' },
        { title: 'Drawdown', body: 'Let the bed level out. Total brew time target is 3:30.', time: '60 sec' }
      ]
    },
    {
      id: 'iced-vanilla-latte',
      name: 'Iced Brown Sugar Vanilla Latte',
      machineCompat: ['espresso-machine'],
      method: 'Espresso',
      icon: '🍦',
      photo: 'https://loremflickr.com/800/600/iced,latte?lock=35',
      thumbClass: 'tile-thumb-gold',
      time: '5 min',
      difficulty: 'Easy',
      tags: ['espresso', 'iced', 'sweet', 'tiktok'],
      author: 'Brew Lab Community',
      desc: 'The viral one. Brown sugar oat milk shaken with vanilla espresso.',
      ratio: '1:2 espresso',
      dose: '18g in / 36g out',
      grind: 'Fine',
      water: 'Espresso pre-set',
      steps: [
        { title: 'Make the brown sugar syrup', body: '2 tbsp brown sugar + 2 tbsp hot water. Stir until dissolved. Add to glass with ice.', time: '1 min' },
        { title: 'Pull espresso', body: 'Standard double over the ice and syrup.', time: '32 sec' },
        { title: 'Vanilla cold foam', body: 'Cold oat milk + 1/4 tsp vanilla. Whisk or shake until frothy.', time: '1 min' },
        { title: 'Top and serve', body: 'Pour foam slowly over the back of a spoon for the layered look.', time: '20 sec' }
      ]
    },
    {
      id: 'french-press-bold',
      name: 'Bold French Press',
      machineCompat: ['french-press'],
      method: 'French press',
      icon: '💪',
      photo: 'https://loremflickr.com/800/600/frenchpress,coffee?lock=36',
      thumbClass: 'tile-thumb',
      time: '8 min',
      difficulty: 'Easy',
      tags: ['french press', 'strong', 'classic'],
      author: 'Brew Lab Team',
      desc: 'Heavy body, full extraction. The classic French press method dialed in for medium-dark roasts.',
      ratio: '1:14',
      dose: '70g coffee / 980ml water',
      grind: 'Medium-coarse',
      water: '200°F (93°C)',
      steps: [
        { title: 'Coarse grind', body: 'Coarser than standard. Looks like raw sugar. Fine grind clogs the mesh.', time: '30 sec' },
        { title: 'Bloom', body: 'Add water just to saturate the grounds. Wait 30 seconds.', time: '30 sec' },
        { title: 'Steep', body: 'Top up with the rest of the water. Steep for 4 minutes total.', time: '4 min' },
        { title: 'Press and pour', body: 'Slow steady press. Pour all of it out so it does not over-extract.', time: '30 sec' }
      ]
    }
  ],

  /* ---------------- Brew School / Classes ---------------- */
  classes: [
    {
      id: 'latte-art-101',
      name: 'Latte Art 101: The Heart',
      level: 'Beginner',
      duration: '32 min',
      lessons: 5,
      instructor: 'Lance H.',
      instructorIcon: '☕',
      icon: '❤️',
      thumbClass: 'tile-thumb-dark',
      desc: 'Pour your first heart in 30 minutes. We cover milk steaming, pitcher technique, and the wiggle.',
      requires: ['EM-15 or similar espresso machine', 'Steam wand', '12oz pitcher', 'Whole or oat milk'],
      lessonsList: [
        { title: 'Why latte art is mostly about milk', time: '4 min' },
        { title: 'Pitcher angle, depth, and the stretch', time: '8 min' },
        { title: 'The microfoam test', time: '5 min' },
        { title: 'Pour mechanics: high then low', time: '8 min' },
        { title: 'Your first heart, on camera', time: '7 min' }
      ],
      enrolled: 8420
    },
    {
      id: 'latte-art-201',
      name: 'Latte Art 201: Tulip & Rosetta',
      level: 'Intermediate',
      duration: '54 min',
      lessons: 7,
      instructor: 'Lance H.',
      instructorIcon: '☕',
      icon: '🌷',
      thumbClass: 'tile-thumb-gold',
      desc: 'Once you can pour a heart, the tulip is the next step. Then we add the wiggle and turn it into a rosetta.',
      requires: ['Latte Art 101 completed', 'Steady pour technique', 'Practice milk (you will use a lot)'],
      lessonsList: [
        { title: 'Tulip mechanics: the stack', time: '10 min' },
        { title: 'Two-leaf, three-leaf, five-leaf tulips', time: '8 min' },
        { title: 'The rosetta: introducing the wiggle', time: '12 min' },
        { title: 'Symmetry and the cut-through', time: '8 min' },
        { title: 'Common rosetta failures', time: '6 min' },
        { title: 'Your rosetta, on camera', time: '7 min' },
        { title: 'Bonus: combining patterns', time: '3 min' }
      ],
      enrolled: 3940
    },
    {
      id: 'milk-steaming',
      name: 'Milk Steaming Fundamentals',
      level: 'Beginner',
      duration: '22 min',
      lessons: 4,
      instructor: 'Morgan E.',
      instructorIcon: '✨',
      icon: '🥛',
      thumbClass: 'tile-thumb',
      desc: 'The single most important skill in espresso drinks. Master microfoam and your latte art journey actually starts.',
      requires: ['Steam wand', 'Pitcher', 'Cold milk'],
      lessonsList: [
        { title: 'What microfoam actually is', time: '5 min' },
        { title: 'The two phases: stretch and roll', time: '7 min' },
        { title: 'Texture by milk type (whole, oat, almond)', time: '6 min' },
        { title: 'Troubleshooting: too foamy, too thin', time: '4 min' }
      ],
      enrolled: 12450
    },
    {
      id: 'espresso-fundamentals',
      name: 'Espresso Fundamentals: From Bean to Shot',
      level: 'Beginner',
      duration: '48 min',
      lessons: 6,
      instructor: 'James H.',
      instructorIcon: '🎬',
      icon: '🫘',
      thumbClass: 'tile-thumb-dark',
      desc: 'Why espresso tastes the way it does, and how to dial in any bag of beans on your EM-15.',
      requires: ['EM-15 or any espresso machine', 'Scale (any kitchen scale works)', 'Fresh beans'],
      lessonsList: [
        { title: 'Pressure, temperature, time: the three variables', time: '8 min' },
        { title: 'Dose, yield, ratio explained', time: '7 min' },
        { title: 'Reading a shot: what to look for', time: '9 min' },
        { title: 'The dial-in process: 5 shots, no more', time: '12 min' },
        { title: 'Common espresso problems', time: '7 min' },
        { title: 'Your first dialed-in shot', time: '5 min' }
      ],
      enrolled: 19840
    },
    {
      id: 'cupping',
      name: 'Cupping: How to Taste Coffee',
      level: 'All levels',
      duration: '38 min',
      lessons: 5,
      instructor: 'James H.',
      instructorIcon: '🎬',
      icon: '👃',
      thumbClass: 'tile-thumb-green',
      desc: 'The same protocol professional buyers use. Develop your palate, build your taste vocabulary, and stop saying "smooth."',
      requires: ['3 different beans (light, medium, dark)', 'Spoon', 'Two bowls'],
      lessonsList: [
        { title: 'Why cupping exists', time: '5 min' },
        { title: 'The protocol: dose, water, timing', time: '8 min' },
        { title: 'The smell test (orthonasal vs retronasal)', time: '7 min' },
        { title: 'Building taste vocabulary', time: '10 min' },
        { title: 'Practice cupping with us', time: '8 min' }
      ],
      enrolled: 5230
    },
    {
      id: 'pour-over-mastery',
      name: 'Pour Over Mastery',
      level: 'Intermediate',
      duration: '44 min',
      lessons: 6,
      instructor: 'James H.',
      instructorIcon: '🎬',
      icon: '🌊',
      thumbClass: 'tile-thumb',
      desc: 'V60, Kalita, Origami. Why the pour matters more than the device. Calibrated for your PO-50.',
      requires: ['Any pour over device (V60, Kalita, Origami)', 'Gooseneck kettle', 'Scale with timer'],
      lessonsList: [
        { title: 'The geometry of pour over', time: '6 min' },
        { title: 'Bloom: what is actually happening', time: '7 min' },
        { title: 'Pulse vs continuous pours', time: '9 min' },
        { title: 'Adjusting for roast level', time: '8 min' },
        { title: 'Diagnosing a bad pour over', time: '8 min' },
        { title: 'Pour with us, real time', time: '6 min' }
      ],
      enrolled: 4180
    }
  ],

  /* ---------------- Creators ---------------- */
  creators: [
    {
      id: 'james-hoffmann',
      name: 'James H.',
      handle: 'WorldCoffeeChamp',
      icon: '🎬',
      followers: '1.6M',
      bio: 'World Barista Champion. Educator. Likes V60s and proper kettles.',
      latestVideo: 'Why your home espresso channels (and how to fix it)',
      tag: 'Verified Expert'
    },
    {
      id: 'lance-hedrick',
      name: 'Lance H.',
      handle: 'PourPerfect',
      icon: '☕',
      followers: '420k',
      bio: 'Specialty barista. Equipment nerd. Tests every machine you ask about.',
      latestVideo: 'Espresso under $300: which machines are worth it',
      tag: 'Verified Expert'
    },
    {
      id: 'morgan-eckroth',
      name: 'Morgan E.',
      handle: 'MorganDrinksCoffee',
      icon: '✨',
      followers: '7.1M',
      bio: 'Café tour videos. Recipe creator. Approachable and warm.',
      latestVideo: 'I made this iced latte 100 times. Here is the best version.',
      tag: 'Brew Lab Partner'
    },
    {
      id: 'european-coffee-trip',
      name: 'European Coffee Trip',
      handle: 'EuropeanCoffeeTrip',
      icon: '🌍',
      followers: '180k',
      bio: 'Documenting cafés and roasters across Europe. Educational, not commercial.',
      latestVideo: 'Inside the worlds smallest specialty roastery',
      tag: 'Verified Expert'
    }
  ],

  /* ---------------- Challenges ---------------- */
  challenges: [
    { id: 'pour-over-week', name: 'Pour Over Week', desc: 'Brew a pour over every day for 7 days. Log each one with a tasting note.', icon: '🌊', reward: '500 pts + Pour Over Pro badge', duration: '7 days', participants: 1247, featured: true, progress: 0 },
    { id: 'taste-along-onyx', name: 'Taste Along: Onyx Monarch', desc: 'Brew the featured Onyx blend three ways and share which you preferred.', icon: '🍫', reward: '300 pts + Taste Along badge', duration: '14 days', participants: 832 },
    { id: 'espresso-mastery', name: 'Espresso Dial-In', desc: 'Pull 10 shots in a week, each one logged with grind and time. We will analyze your patterns.', icon: '🎯', reward: '750 pts + Espresso Adept badge', duration: '7 days', participants: 412 },
    { id: 'latte-art-30day', name: '30 Days of Latte Art', desc: 'Pour a heart every day for 30 days. Submit your best for a chance to win a milk pitcher set.', icon: '❤️', reward: '1000 pts + Latte Artist badge', duration: '30 days', participants: 1856 },
    { id: 'cold-brew-summer', name: 'Cold Brew Summer', desc: 'Try four cold brew recipes in 30 days. Vote on which becomes the official Brew Lab pick.', icon: '🧊', reward: '400 pts + early access to summer drop', duration: '30 days', participants: 2104 }
  ],

  /* ---------------- Badges ---------------- */
  badges: [
    { id: 'first-brew', name: 'First Brew', icon: '☕', desc: 'Logged your first brew', color: 'caramel' },
    { id: 'taste-profile', name: 'Self Aware', icon: '🧠', desc: 'Completed taste profile', color: 'caramel' },
    { id: 'streak-7', name: 'Week One', icon: '🔥', desc: '7-day brew streak', color: 'caramel' },
    { id: 'streak-30', name: 'Daily Driver', icon: '⚡', desc: '30-day brew streak', color: 'gold' },
    { id: 'pour-over-pro', name: 'Pour Over Pro', icon: '🌊', desc: 'Completed Pour Over Week', color: 'green' },
    { id: 'espresso-adept', name: 'Espresso Adept', icon: '🎯', desc: '10 logged shots', color: 'green' },
    { id: 'latte-artist', name: 'Latte Artist', icon: '🎨', desc: 'Completed Latte Art 101', color: 'gold' },
    { id: 'critic', name: 'Critic', icon: '⭐', desc: '25 tasting notes written', color: 'gold' },
    { id: 'explorer', name: 'Explorer', icon: '🌍', desc: '5 different roasters tried', color: 'gold' },
    { id: 'community', name: 'Community Voice', icon: '🗣️', desc: 'First comment on a creator post', color: 'caramel' },
    { id: 'machine-master', name: 'Brew Setup', icon: '⚙️', desc: 'Added your equipment to your profile', color: 'green' },
    { id: 'recipe-author', name: 'Recipe Author', icon: '📝', desc: 'Submitted an original recipe', color: 'gold' },
    { id: 'beta', name: 'Brew Lab Beta', icon: '🧪', desc: 'Joined in the first 1000', color: 'green' }
  ],

  /* ---------------- Community giveaways (free entries, milestone rewards) ---------------- */
  giveaways: [
    { id: 'signed-mug', name: 'Signed Brew Lab Mug', kind: 'Giveaway', desc: '50 mugs, signed by James H. Free entry for everyone. Drawing in 5 days.', icon: '🏆', bg: 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)', status: '50 winners drawn Friday' },
    { id: 'milk-pitcher', name: 'Latte Art Pitcher Set', kind: 'Milestone reward', desc: 'Reach the Specialty Brewer tier and submit a pour to the leaderboard. Top 10 each month win a pitcher.', icon: '🥛', bg: 'linear-gradient(135deg, var(--espresso) 0%, #3D2418 100%)', status: 'Open all month' },
    { id: 'creator-coffee', name: 'Coffee with a Creator', kind: 'Quarterly raffle', desc: 'A 30-minute virtual session with one of our verified creators. Open to all members.', icon: '🎬', bg: 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)', status: 'Next draw March 1' }
  ],

  /* ---------------- Sample creator posts ---------------- */
  feed: [
    { id: 'p1', author: 'James H.', authorIcon: '🎬', verified: true, time: '2h ago', title: 'Why your home espresso channels (and how to fix it)', kind: 'Video', duration: '11 min', desc: 'A walkthrough of distribution and tamping fundamentals on any home espresso machine.' },
    { id: 'p2', author: 'Brew Lab Team', authorIcon: '🧪', verified: true, time: '1d ago', title: 'Reading a coffee bag: a beginners guide', kind: 'Article', duration: '5 min', desc: 'Roast date, processing method, varietal. What actually matters.' },
    { id: 'p3', author: 'Morgan E.', authorIcon: '✨', verified: true, time: '2d ago', title: 'I made this iced latte 100 times', kind: 'Video', duration: '8 min', desc: 'Three small changes that took the recipe from fine to obsessed.' }
  ],

  /* ---------------- Virtual Barista ---------------- */
  baristaPrompts: [
    'My espresso tastes sour. What do I do?',
    'Best beans for a milky drink?',
    'How fine should I grind for the EM-15?',
    'Why is my cold brew weak?',
    'Recommend something different from my usual',
    'How do I pour a heart?'
  ],

  baristaResponses: {
    'sour': "Sour usually means under-extracted. Three things to try in order: grind a touch finer, raise your dose by 1g (so 18g instead of 17g), and check your water temp. Aim for 200°F before pulling. If it still tastes sour, the beans may be too fresh. Give them 5-7 days off-roast.",
    'milky': "Medium to medium-dark roasts cut through milk best. From your list, try Onyx Monarch or Blue Bottle Bella Donovan. Rich, chocolatey, balanced. Hold off on light roasts for milk drinks. They get muted.",
    'grind': "For most medium roasts, target shot times of 27-32 seconds for a double. If your shots run faster than 25 seconds, grind one notch finer. Slower than 35, one notch coarser. Same beans behave differently as they age, so dial in weekly.",
    'cold brew': "Three culprits for weak cold brew. First, ratio. Try 1:8 instead of 1:12 if you want a concentrate. Second, grind. Too coarse and you under-extract. Aim for raw-sugar texture. Third, time. 20 hours in the fridge is the sweet spot.",
    'recommend': "Based on your taste profile and recent journal entries, I would push you toward something brighter. Try Trade Light & Lively for a week. It is a different sensory experience from your usual chocolate-forward picks and may surprise you.",
    'cafe': "If you like medium roast and chocolate notes, order a flat white or cortado. Short milk drinks let the bean speak. Avoid the seasonal flavored drinks if you want to actually taste the coffee. A pour over is a great way to try a new origin without committing to a bag.",
    'art': "Latte art starts and ends with the milk. Stretch for 3-4 seconds to get microfoam, roll for the rest. Pour high to push the espresso, drop close to the surface, and either stop (heart) or wiggle (rosetta). We have a 32-min Latte Art 101 class with Lance Hedrick.",
    'default': "Tell me what you are working on. Pulling a shot, brewing drip, choosing beans, troubleshooting a recipe, learning latte art. I can help with all of those. You can also drop in a tasting note from your journal and I will suggest a tweak."
  },

  /* ---------------- Onboarding quiz ---------------- */
  quiz: [
    {
      id: 'machine',
      title: 'How do you brew at home?',
      subtitle: 'Pick the method you reach for most. You can change this any time.',
      type: 'single',
      options: [
        { value: 'drip-auto', label: 'Drip / automatic brewer', desc: 'Standard 8-12 cup machine', icon: '☕' },
        { value: 'espresso-machine', label: 'Espresso machine', desc: 'Pump espresso with steam wand', icon: '🫘' },
        { value: 'pour-over', label: 'Pour over', desc: 'Manual, gooseneck kettle', icon: '🌊' },
        { value: 'french-press', label: 'French press', desc: 'Immersion brewer', icon: '💪' },
        { value: 'pod', label: 'Single-serve pods', desc: 'Keurig, Nespresso, etc.', icon: '⚡' },
        { value: 'cold-brew', label: 'Cold brew at home', desc: 'Slow steep or rapid', icon: '🧊' },
        { value: 'aeropress', label: 'AeroPress', desc: 'Pressure-immersion hybrid', icon: '🎯' },
        { value: 'none', label: 'I am just getting started', desc: 'No equipment yet, just curious', icon: '✨' }
      ]
    },
    {
      id: 'experience',
      title: 'How would you describe your coffee experience?',
      subtitle: 'No wrong answer. Helps us pitch content at the right level.',
      type: 'single',
      options: [
        { value: 'beginner', label: 'Just getting into it', desc: 'I want to learn what makes coffee good', icon: '🌱' },
        { value: 'casual', label: 'Drink it daily, do not overthink it', desc: 'Make it taste good and quick', icon: '☕' },
        { value: 'curious', label: 'Curious enthusiast', desc: 'I weigh my beans sometimes', icon: '🔍' },
        { value: 'nerd', label: 'Coffee nerd', desc: 'I own a refractometer', icon: '🔬' }
      ]
    },
    {
      id: 'roast',
      title: 'Pick the roast level you reach for first',
      subtitle: 'Even if you are not sure. We will refine over time.',
      type: 'single',
      options: [
        { value: 'light', label: 'Light roast', desc: 'Bright, fruity, tea-like', icon: '☀️' },
        { value: 'medium-light', label: 'Medium-light', desc: 'Sweet, balanced, citrus', icon: '🌅' },
        { value: 'medium', label: 'Medium', desc: 'Caramel, chocolate, classic', icon: '🌄' },
        { value: 'medium-dark', label: 'Medium-dark', desc: 'Bold, rich, smoky', icon: '🌆' },
        { value: 'dark', label: 'Dark roast', desc: 'Strong, bittersweet, intense', icon: '🌙' }
      ]
    },
    {
      id: 'flavors',
      title: 'Which flavors get you excited?',
      subtitle: 'Pick as many as you like.',
      type: 'multi',
      options: [
        { value: 'fruity', label: 'Fruity', desc: 'Berry, citrus, stone fruit', icon: '🍓' },
        { value: 'chocolate', label: 'Chocolate', desc: 'Dark cocoa, milk chocolate', icon: '🍫' },
        { value: 'nutty', label: 'Nutty / caramel', desc: 'Almond, hazelnut, toffee', icon: '🥜' },
        { value: 'floral', label: 'Floral / tea', desc: 'Jasmine, honeysuckle, bergamot', icon: '🌸' },
        { value: 'spicy', label: 'Spice / earth', desc: 'Cinnamon, cedar, tobacco', icon: '🌶️' },
        { value: 'sweet', label: 'Pure sweetness', desc: 'Honey, brown sugar, syrup', icon: '🍯' }
      ]
    },
    {
      id: 'milk',
      title: 'Milk situation?',
      subtitle: 'Drives whether we suggest espresso drinks or black coffee.',
      type: 'single',
      options: [
        { value: 'black', label: 'Always black', desc: 'No milk, no sugar', icon: '⚫' },
        { value: 'splash', label: 'Splash of milk', desc: 'Mostly black, occasional splash', icon: '🥄' },
        { value: 'latte', label: 'Latte/cappuccino person', desc: 'Espresso plus milk', icon: '🥛' },
        { value: 'sweet', label: 'I like sweet drinks', desc: 'Syrups, flavors, lattes', icon: '🍦' },
        { value: 'mix', label: 'Depends on my mood', desc: 'Range across the board', icon: '🎨' }
      ]
    },
    {
      id: 'goal',
      title: 'What brought you here?',
      subtitle: 'Pick all that fit.',
      type: 'multi',
      options: [
        { value: 'better', label: 'Make better coffee at home', desc: 'Stop wasting money at cafés', icon: '🎯' },
        { value: 'learn', label: 'Learn how all this works', desc: 'I want to understand the craft', icon: '📚' },
        { value: 'discover', label: 'Find new beans I love', desc: 'Bored of my supermarket coffee', icon: '🔍' },
        { value: 'community', label: 'Connect with other coffee people', desc: 'My friends do not care about V60s', icon: '👥' },
        { value: 'machine', label: 'Get more out of my equipment', desc: 'Use the features I never use', icon: '⚙️' },
        { value: 'art', label: 'Learn latte art', desc: 'I want to pour a heart', icon: '🎨' }
      ]
    }
  ],

  /* ---------------- Sommelier Track (5 tiers) ---------------- */
  sommelierTiers: [
    {
      id: 'apprentice',
      name: 'Apprentice Brewer',
      icon: '🌱',
      color: 'caramel',
      minPoints: 0,
      desc: 'Welcome to the path. Every coffee journey starts here.',
      requirements: [
        { type: 'profile', label: 'Complete your taste profile' }
      ],
      perks: [
        'Personalized recipe recommendations',
        'Brew journal with pattern insights',
        'Access to community challenges'
      ],
      memberCount: 28430
    },
    {
      id: 'home-barista',
      name: 'Home Barista',
      icon: '☕',
      color: 'caramel',
      minPoints: 500,
      desc: 'You can pull a shot. You know what microfoam is.',
      requirements: [
        { type: 'class', value: 'espresso-fundamentals', label: 'Complete Espresso Fundamentals' },
        { type: 'class', value: 'milk-steaming', label: 'Complete Milk Steaming Fundamentals' },
        { type: 'journal', value: 10, label: 'Log 10 brews' }
      ],
      perks: [
        'Verified Home Barista flair on your profile',
        'Submit your recipes for community review',
        'Unlock advanced brew challenges'
      ],
      memberCount: 9120
    },
    {
      id: 'specialty',
      name: 'Specialty Brewer',
      icon: '🌊',
      color: 'green',
      minPoints: 1500,
      desc: 'Pour over and latte art are part of your morning routine.',
      requirements: [
        { type: 'class', value: 'pour-over-mastery', label: 'Complete Pour Over Mastery' },
        { type: 'class', value: 'latte-art-101', label: 'Complete Latte Art 101' },
        { type: 'journal', value: 25, label: 'Log 25 brews' }
      ],
      perks: [
        'Specialty Brewer profile flair',
        'Host community taste-along events',
        'Mentor newcomers in the community feed'
      ],
      memberCount: 3140
    },
    {
      id: 'connoisseur',
      name: 'Coffee Connoisseur',
      icon: '🎯',
      color: 'gold',
      minPoints: 3000,
      desc: 'You taste differences other people cannot describe.',
      requirements: [
        { type: 'class', value: 'cupping', label: 'Complete Cupping: How to Taste Coffee' },
        { type: 'journal', value: 50, label: 'Log 50 brews' },
        { type: 'origins', value: 5, label: 'Try beans from 5 different origins' }
      ],
      perks: [
        'Quarterly AMA invites with featured creators',
        'Vote on community spotlights and featured beans',
        'Connoisseur flair across Brew Lab'
      ],
      memberCount: 870
    },
    {
      id: 'sommelier',
      name: 'Coffee Sommelier',
      icon: '🏆',
      color: 'gold',
      minPoints: 5000,
      desc: 'The final tier. You know coffee at a level few do.',
      requirements: [
        { type: 'class', value: 'latte-art-201', label: 'Complete Latte Art 201' },
        { type: 'allClasses', label: 'Complete all Brew School classes' },
        { type: 'journal', value: 100, label: 'Log 100 brews' },
        { type: 'streak', value: 30, label: 'Maintain a 30-day brew streak' },
        { type: 'origins', value: 5, label: 'Try 5+ different origins' }
      ],
      perks: [
        'Co-host a community AMA',
        'Sommelier flair (gold) across Brew Lab',
        'Annual Sommelier gathering invitation',
        'Official Coffee Sommelier certification document'
      ],
      memberCount: 142
    }
  ],

  /* ---------------- AI Drink Recommender catalog ---------------- */
  /* Each drink scored against user inputs. Highest score wins. */
  aiDrinks: [
    { id: 'espresso', name: 'Straight Espresso', icon: '🫘', desc: 'Pure shot of espresso. Bold, concentrated, fast.', temp: 'hot', strength: 'strong', milk: false, sweet: false, time: 'quick', recipeId: null, tags: ['intense', 'classic'] },
    { id: 'macchiato', name: 'Espresso Macchiato', icon: '☕', desc: 'Espresso with a small dollop of foamed milk on top. The middle ground.', temp: 'hot', strength: 'strong', milk: true, sweet: false, time: 'quick', recipeId: null, tags: ['classic', 'small'] },
    { id: 'cortado', name: 'Cortado', icon: '🥃', desc: 'Equal espresso and steamed milk. Mellows the espresso just enough.', temp: 'hot', strength: 'strong', milk: true, sweet: false, time: 'quick', recipeId: null, tags: ['balanced', 'small'] },
    { id: 'latte', name: 'Cafe Latte', icon: '🥛', desc: 'Espresso with a generous pour of steamed milk. Smooth and approachable.', temp: 'hot', strength: 'medium', milk: true, sweet: false, time: 'quick', recipeId: 'sat-morning-latte', tags: ['smooth', 'classic'] },
    { id: 'cappuccino', name: 'Cappuccino', icon: '☕', desc: 'Espresso, steamed milk, and a thick foam cap. Foam-forward.', temp: 'hot', strength: 'medium', milk: true, sweet: false, time: 'quick', recipeId: null, tags: ['foam', 'classic'] },
    { id: 'flat-white', name: 'Flat White', icon: '🥛', desc: 'Espresso with microfoam, no foam cap. Australian-style.', temp: 'hot', strength: 'medium', milk: true, sweet: false, time: 'quick', recipeId: null, tags: ['silky'] },
    { id: 'mocha', name: 'Cafe Mocha', icon: '🍫', desc: 'Espresso with chocolate syrup and steamed milk. Dessert in a cup.', temp: 'hot', strength: 'medium', milk: true, sweet: true, time: 'quick', recipeId: null, tags: ['chocolate', 'dessert'] },
    { id: 'drip', name: 'Morning Drip', icon: '☀️', desc: 'A balanced cup that lets the bean speak. The everyday classic.', temp: 'hot', strength: 'medium', milk: false, sweet: false, time: 'quick', recipeId: 'morning-classic', tags: ['classic', 'everyday'] },
    { id: 'pour-over', name: 'Pour Over', icon: '🌊', desc: 'Hand-poured. Highlights complexity. Best for light roasts.', temp: 'hot', strength: 'medium', milk: false, sweet: false, time: 'slow', recipeId: 'pour-over-light', tags: ['ritual', 'clarity'] },
    { id: 'french-press', name: 'French Press', icon: '💪', desc: 'Heavy body, full extraction. Strong without being bitter.', temp: 'hot', strength: 'strong', milk: false, sweet: false, time: 'slow', recipeId: 'french-press-bold', tags: ['heavy', 'classic'] },
    { id: 'americano', name: 'Americano', icon: '☕', desc: 'Espresso diluted with hot water. Drip strength, espresso flavor.', temp: 'hot', strength: 'medium', milk: false, sweet: false, time: 'quick', recipeId: null, tags: ['diluted'] },
    { id: 'iced-americano', name: 'Iced Americano', icon: '🧊', desc: 'Espresso over cold water and ice. Refreshing, low calorie.', temp: 'cold', strength: 'medium', milk: false, sweet: false, time: 'quick', recipeId: null, tags: ['refreshing'] },
    { id: 'iced-latte', name: 'Iced Latte', icon: '🧊', desc: 'Espresso over cold milk and ice. The hot weather staple.', temp: 'cold', strength: 'medium', milk: true, sweet: false, time: 'quick', recipeId: null, tags: ['summer'] },
    { id: 'iced-vanilla', name: 'Iced Brown Sugar Vanilla Latte', icon: '🍦', desc: 'Brown sugar oat milk shaken with vanilla espresso. The viral one.', temp: 'cold', strength: 'medium', milk: true, sweet: true, time: 'quick', recipeId: 'iced-vanilla-latte', tags: ['sweet', 'viral'] },
    { id: 'cold-brew', name: 'Cold Brew', icon: '🧊', desc: 'Slow-steeped concentrate. Smooth, low-acid, strong.', temp: 'cold', strength: 'strong', milk: false, sweet: false, time: 'slow', recipeId: 'cold-brew-classic', tags: ['smooth', 'low-acid'] },
    { id: 'cold-brew-milk', name: 'Cold Brew with Milk', icon: '🧊', desc: 'Cold brew concentrate diluted with milk. Smooth and creamy.', temp: 'cold', strength: 'strong', milk: true, sweet: false, time: 'slow', recipeId: 'cold-brew-classic', tags: ['smooth', 'creamy'] },
    { id: 'affogato', name: 'Affogato', icon: '🍨', desc: 'Espresso poured over a scoop of vanilla ice cream. Dessert + caffeine.', temp: 'cold', strength: 'strong', milk: true, sweet: true, time: 'quick', recipeId: null, tags: ['dessert', 'fun'] },
    { id: 'mazagran', name: 'Mazagran', icon: '🍋', desc: 'Iced coffee with lemon. Portuguese summer drink.', temp: 'cold', strength: 'medium', milk: false, sweet: false, time: 'quick', recipeId: null, tags: ['unusual', 'citrus'] }
  ],

  /* ---------------- Cafes (continental US, mapped on Home) ---------------- */
  /* Dirt Cowboy is the only "active" cafe (story video published). The
     other nine are gold-ringed "story coming soon" markers. */
  cafes: [
    { id: 'dirt-cowboy',     name: 'Dirt Cowboy Cafe',         short: 'Dirt Cowboy',     hood: 'Hanover, New Hampshire',     coords: [43.7022,  -72.2896], drinks: ['Pour-over', 'Espresso', 'Cappuccino'],                  photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80', status: 'active' },
    { id: 'the-works',       name: 'The Works Bakery Cafe',    short: 'The Works',       hood: 'Hanover, New Hampshire',     coords: [43.7018,  -72.2898], drinks: ['Drip', 'Latte', 'Mocha'],                                photoUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&q=80', status: 'soon'   },
    { id: 'umplebys',        name: "Umpleby's Bakery & Cafe",  short: "Umpleby's",       hood: 'Norwich, Vermont',           coords: [43.7155,  -72.3057], drinks: ['Drip', 'Cappuccino', 'Cold brew'],                       photoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80', status: 'soon'   },
    { id: 'joe-coffee',      name: 'Joe Coffee Company',       short: 'Joe Coffee',      hood: 'New York, New York',         coords: [40.7335,  -74.0027], drinks: ['Espresso', 'Latte', 'Cold brew'],                        photoUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80', status: 'soon'   },
    { id: 'counter-culture', name: 'Counter Culture Coffee',   short: 'Counter Culture', hood: 'Durham, North Carolina',     coords: [35.9293,  -78.8794], drinks: ['Pour-over', 'Espresso', 'Cappuccino'],                   photoUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80', status: 'soon'   },
    { id: 'intelligentsia',  name: 'Intelligentsia Coffee',    short: 'Intelligentsia',  hood: 'Chicago, Illinois',          coords: [41.9081,  -87.7079], drinks: ['Black Cat espresso', 'Pour-over', 'Cortado'],            photoUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400&q=80', status: 'soon'   },
    { id: 'sweet-bloom',     name: 'Sweet Bloom Coffee',       short: 'Sweet Bloom',     hood: 'Lakewood, Colorado',         coords: [39.7392, -105.0844], drinks: ['Pour-over', 'Espresso', 'Cortado'],                      photoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80', status: 'soon'   },
    { id: 'cuvee',           name: 'Cuvée Coffee Bar',         short: 'Cuvée',           hood: 'Austin, Texas',              coords: [30.2625,  -97.7295], drinks: ['Black & White', 'Cold brew', 'Latte'],                   photoUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&q=80', status: 'soon'   },
    { id: 'stumptown',       name: 'Stumptown Coffee',         short: 'Stumptown',       hood: 'Portland, Oregon',           coords: [45.5230, -122.6760], drinks: ['Hair Bender espresso', 'Cold brew', 'Pour-over'],        photoUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400&q=80', status: 'soon'   },
    { id: 'blue-bottle',     name: 'Blue Bottle Coffee',       short: 'Blue Bottle',     hood: 'San Francisco, California',  coords: [37.7820, -122.4079], drinks: ['New Orleans iced coffee', 'Gibraltar', 'Pour-over'],     photoUrl: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400&q=80', status: 'soon'   }
  ],

  /* ---------------- Coffee Wall (community photo feed) ---------------- */
  /* Like a feed of coffee photos. Anyone can post. */
  wallPosts: [
    { id: 'w1', author: 'Maya R.', initials: 'MR', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #A85F1F 100%)', drink: 'V60 pour over', timeAgo: '8m ago', caption: 'Day 18 of pour over week. Onyx Monarch is brewing better every day.', photo: 'https://loremflickr.com/600/600/pourover,coffee?lock=51', likes: 47, comments: 6 },
    { id: 'w2', author: 'Diego P.', initials: 'DP', avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #1d3327 100%)', drink: 'Latte', timeAgo: '34m ago', caption: 'First successful tulip after weeks of practice. The stretch is finally clicking.', photo: 'https://loremflickr.com/600/600/latte,art?lock=52', likes: 124, comments: 18 },
    { id: 'w3', author: 'Tessa L.', initials: 'TL', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #2A1A14 100%)', drink: 'Cortado', timeAgo: '1h ago', caption: 'Counter Culture Hologram on the EM-15. Thick crema, sweet finish.', photo: 'https://loremflickr.com/600/600/espresso,cortado?lock=53', likes: 89, comments: 11 },
    { id: 'w4', author: 'Priya S.', initials: 'PS', avatarBg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', drink: 'Iced latte', timeAgo: '2h ago', caption: 'Brown sugar oat milk over Brazilian Santos. Saturday morning ritual.', photo: 'https://loremflickr.com/600/600/iced,coffee?lock=54', likes: 203, comments: 24 },
    { id: 'w5', author: 'Alex T.', initials: 'AT', avatarBg: 'linear-gradient(135deg, #5476A6 0%, #2c4869 100%)', drink: 'Drip', timeAgo: '3h ago', caption: 'DCC-3200 doing its thing. 12 cup batch for the office.', photo: 'https://loremflickr.com/600/600/coffee,morning?lock=55', likes: 31, comments: 3 },
    { id: 'w6', author: 'Naomi K.', initials: 'NK', avatarBg: 'linear-gradient(135deg, #1F1410 0%, #4A3A30 100%)', drink: 'Pour over', timeAgo: '4h ago', caption: 'Trade Light & Lively, V60. Tea-like and lemony. Light roast forever.', photo: 'https://loremflickr.com/600/600/coffee,light?lock=56', likes: 64, comments: 7 },
    { id: 'w7', author: 'Marcus B.', initials: 'MB', avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #C5962B 100%)', drink: 'Espresso', timeAgo: '6h ago', caption: 'First espresso shot that actually tasted like coffee instead of bitter water. Week 2 of practice.', photo: 'https://loremflickr.com/600/600/espresso,shot?lock=57', likes: 156, comments: 22 },
    { id: 'w8', author: 'Jordan W.', initials: 'JW', avatarBg: 'linear-gradient(135deg, #6B5D54 0%, #3D2418 100%)', drink: 'Cold brew', timeAgo: '8h ago', caption: 'Started this batch yesterday morning. 1:8 concentrate. 20 hour steep.', photo: 'https://loremflickr.com/600/600/coldbrew,coffee?lock=58', likes: 78, comments: 9 },
    { id: 'w9', author: 'Rafael H.', initials: 'RH', avatarBg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', drink: 'French press', timeAgo: '12h ago', caption: 'French press with Brazilian Santos. Heavy body, low acid. Sunday morning sorted.', photo: 'https://loremflickr.com/600/600/frenchpress,coffee?lock=59', likes: 42, comments: 4 },
    { id: 'w10', author: 'Sam K.', initials: 'SK', avatarBg: 'linear-gradient(135deg, #4A3A30 0%, #2A1A14 100%)', drink: 'Cappuccino', timeAgo: '1d ago', caption: 'Cinnamon dusted cappuccino. Whole milk. The classic.', photo: 'https://loremflickr.com/600/600/cappuccino,coffee?lock=60', likes: 91, comments: 12 }
  ],

  /* ---------------- Latte Art submissions (leaderboard) ---------------- */
  latteArt: [
    { id: 'la1', member: 'Maya R.', initials: 'MR', pattern: 'Rosetta', machine: 'Espresso machine', votes: 412, daysAgo: 1, gradient: 'linear-gradient(135deg, #C8A982 0%, #6B4A2E 100%)', accent: '🌿', notes: 'Eight-leaf rosetta. Took me 200 attempts.' },
    { id: 'la2', member: 'Diego P.', initials: 'DP', pattern: 'Tulip', machine: 'Espresso machine', votes: 387, daysAgo: 1, gradient: 'linear-gradient(135deg, #D4B894 0%, #7D5A36 100%)', accent: '🌷', notes: 'Five-stack tulip. Whole milk, 5oz pitcher.' },
    { id: 'la3', member: 'Priya S.', initials: 'PS', pattern: 'Swan', machine: 'Espresso machine', votes: 356, daysAgo: 2, gradient: 'linear-gradient(135deg, #C9A87A 0%, #5C3D22 100%)', accent: '🦢', notes: 'First swan attempt. Beak almost worked.' },
    { id: 'la4', member: 'Alex T.', initials: 'AT', pattern: 'Rosetta', machine: 'Espresso machine', votes: 298, daysAgo: 2, gradient: 'linear-gradient(135deg, #CDB089 0%, #6F4E2C 100%)', accent: '🍃', notes: 'Oat milk rosetta. Surprisingly good contrast.' },
    { id: 'la5', member: 'Sam K.', initials: 'SK', pattern: 'Heart', machine: 'Espresso machine', votes: 274, daysAgo: 3, gradient: 'linear-gradient(135deg, #D2B591 0%, #745330 100%)', accent: '❤️', notes: 'Day 14 of 30 Days of Latte Art challenge.' },
    { id: 'la6', member: 'Jordan W.', initials: 'JW', pattern: 'Tulip', machine: 'Espresso machine', votes: 251, daysAgo: 3, gradient: 'linear-gradient(135deg, #BFA478 0%, #67482A 100%)', accent: '🌸', notes: 'Three-stack. Symmetry is finally clicking.' },
    { id: 'la7', member: 'Tessa L.', initials: 'TL', pattern: 'Rosetta', machine: 'Espresso machine', votes: 234, daysAgo: 4, gradient: 'linear-gradient(135deg, #CAA980 0%, #6E4D2E 100%)', accent: '🌾', notes: '12-leaf rosetta with cut-through. Best pour this week.' },
    { id: 'la8', member: 'Marcus B.', initials: 'MB', pattern: 'Heart', machine: 'Espresso machine', votes: 198, daysAgo: 4, gradient: 'linear-gradient(135deg, #D6BB94 0%, #785530 100%)', accent: '💛', notes: 'First successful heart after Latte Art 101.' },
    { id: 'la9', member: 'Naomi K.', initials: 'NK', pattern: 'Tulip', machine: 'Espresso machine', votes: 176, daysAgo: 5, gradient: 'linear-gradient(135deg, #C2A57C 0%, #6A4929 100%)', accent: '🌼', notes: 'Inverted tulip. Flow rate finally consistent.' },
    { id: 'la10', member: 'Rafael H.', initials: 'RH', pattern: 'Heart', machine: 'Espresso machine', votes: 142, daysAgo: 5, gradient: 'linear-gradient(135deg, #D0AE82 0%, #71502D 100%)', accent: '☕', notes: 'Bigger heart this time. Pitcher angle adjustment.' }
  ],

  /* Pattern reference - shown on the leaderboard for legend */
  lattePatterns: [
    { name: 'Heart', icon: '❤️', difficulty: 'Beginner', desc: 'The first pattern most baristas learn' },
    { name: 'Tulip', icon: '🌷', difficulty: 'Intermediate', desc: 'Stacked hearts, 3-7 layers' },
    { name: 'Rosetta', icon: '🌿', difficulty: 'Intermediate', desc: 'Wiggle pour for symmetric leaves' },
    { name: 'Swan', icon: '🦢', difficulty: 'Advanced', desc: 'Combines etching with free pour' }
  ],

  /* ---------------- Sample journal entries (seed for demo) ---------------- */
  seedJournal: [
    { date: '2026-04-28', time: '07:42', recipe: 'morning-classic', bean: 'onyx-monarch', method: 'Drip', rating: 4, notes: 'Sweeter than yesterday. Could grind one notch finer for a touch more body.', flavors: ['chocolate', 'sweet'] },
    { date: '2026-04-26', time: '08:11', recipe: 'morning-classic', bean: 'counter-hologram', method: 'Drip', rating: 5, notes: 'Pulled out caramel notes I had not noticed before. Standard ratio worked.', flavors: ['nutty', 'sweet'] },
    { date: '2026-04-23', time: '14:30', recipe: 'sat-morning-latte', bean: 'blue-bottle-bella', method: 'Espresso', rating: 4, notes: 'Latte art was almost there. Milk was a bit too foamy.', flavors: ['chocolate'] }
  ]
};
