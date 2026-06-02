// ─── Types ────────────────────────────────────────────────────────────────────
export interface Cut {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  priceRange: { min: number; max: number };
  unit?: "kg" | "piece";
  rating: number;
  reviews: number;
  badge?: string;
  description: string;
  longDescription: string;
  image: string;
  cuts: Cut[];
  origin: string;
  nutritionHighlights: string[];
}

// ─── Config ────────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  "All",
  "Seafood",
  "Fish",
  "Chicken",
  "Mutton",
  "Country Chicken",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  All: "🛒",
  Seafood: "🦐",
  Fish: "🐟",
  Chicken: "🍗",
  Mutton: "🥩",
  "Country Chicken": "🐓",
};

export const BADGE_STYLES: Record<string, string> = {
  "Best Seller": "bg-amber-400 text-amber-950",
  Popular: "bg-teal-400 text-teal-950",
  Premium: "bg-violet-400 text-violet-950",
  Fresh: "bg-emerald-400 text-emerald-950",
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // ══════════════════════════ SEAFOOD ══════════════════════════
  {
    id: 1,
    name: "Tiger Prawns",
    category: "Seafood",
    price: 34.5,
    priceRange: { min: 29.99, max: 39.99 },
    unit: "kg",
    rating: 4.8,
    reviews: 128,
    badge: "Best Seller",
    description: "Large, juicy tiger prawns perfect for grilling or curries",
    longDescription:
      "Our Tiger Prawns are sourced fresh from the pristine coastal waters of the Bay of Bengal and responsibly farmed aquaculture zones. Known for their firm, juicy meat and distinctive tiger-stripe shell, they're a versatile seafood favourite that shines in everything from spicy South Indian curries to grilled BBQ platters. Delivered fresh the same day they're harvested for maximum quality.",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole-shell", name: "Whole with Shell", price: 29.99, description: "Shell-on for maximum flavour, ideal for curries" },
      { id: "peeled-deveined", name: "Peeled & Deveined", price: 34.5, description: "Clean, ready-to-cook with vein removed" },
      { id: "butterfly", name: "Butterfly Cut", price: 36.99, description: "Split open for quick cooking and presentation" },
      { id: "marinated", name: "Tandoori Marinated", price: 39.99, description: "Pre-marinated in signature spice blend, ready to grill" },
    ],
    origin: "Bay of Bengal, Coastal Tamilnadu",
    nutritionHighlights: ["High Protein 20g/100g", "Very Low Fat <2g", "Rich in Omega-3", "Excellent Selenium Source"],
  },
  {
    id: 2,
    name: "Live Mud Crab",
    category: "Seafood",
    price: 45.0,
    priceRange: { min: 45.0, max: 55.0 },
    unit: "kg",
    rating: 4.9,
    reviews: 95,
    badge: "Premium",
    description: "Freshest live mud crabs packed with sweet, tender meat",
    longDescription:
      "Wild-caught from the mangrove-rich backwaters along the Tamil Nadu and Kerala coasts, our Mud Crabs are celebrated for their rich, sweet meat and roe-filled shells. These crustaceans are kept alive right until delivery, ensuring unbeatable freshness. A prized delicacy perfect for crab masala, pepper crab, or steamed with melted butter.",
    image:
      "https://images.unsplash.com/photo-1560064506-69165683d735?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "live", name: "Live Crab", price: 45.0, description: "Fresh live crab, full natural weight" },
      { id: "cleaned-split", name: "Cleaned & Split", price: 48.0, description: "Cleaned and halved for quick curries" },
      { id: "curry-cut", name: "Curry Cut Pieces", price: 50.0, description: "Cut into portions for easy cooking" },
      { id: "marinated", name: "Masala Marinated", price: 55.0, description: "Pre-marinated in traditional Indian spices" },
    ],
    origin: "Palk Bay & Kerala Backwaters",
    nutritionHighlights: ["High Protein 19g/100g", "Rich in Zinc", "Good Omega-3 Content", "Vitamin B12 Rich"],
  },
  {
    id: 3,
    name: "Jumbo Shrimp",
    category: "Seafood",
    price: 29.99,
    priceRange: { min: 25.99, max: 33.99 },
    unit: "kg",
    rating: 4.7,
    reviews: 112,
    badge: "Popular",
    description: "Succulent jumbo shrimp, deveined and ready to cook",
    longDescription:
      "Our Jumbo Shrimp are selected from premium aqua farms and cold-water wild catches known for the plumpest, most flavorful shrimp. With a satisfying snap when bitten and natural sweetness, they're versatile enough for a quick garlic sauté, classic prawn biryani, or a show-stopping cocktail platter. Cleaned and ready to cook.",
    image:
      "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole-shell", name: "Whole Shell-on", price: 25.99, description: "Full shrimp with shell for grilling" },
      { id: "peeled-headless", name: "Peeled & Headless", price: 29.99, description: "Shell removed, head off, deveined" },
      { id: "cocktail", name: "Cocktail Ready (Tail-on)", price: 31.99, description: "Peeled with tail-on for presentation" },
      { id: "marinated", name: "Garlic Butter Marinated", price: 33.99, description: "Pre-marinated in garlic butter blend" },
    ],
    origin: "Chilika Lake, Odisha & Gulf of Mannar",
    nutritionHighlights: ["High Protein 20g/100g", "Low Calorie 85kcal", "Rich in Iodine", "Good source of Omega-3"],
  },
  {
    id: 4,
    name: "Squid (Calamari)",
    category: "Seafood",
    price: 22.0,
    priceRange: { min: 18.0, max: 26.0 },
    unit: "kg",
    rating: 4.5,
    reviews: 67,
    badge: "Fresh",
    description: "Tender cleaned squid, perfect for fry or curry",
    longDescription:
      "Sourced fresh from deep-sea fishing boats operating off the Coromandel Coast, our squid is renowned for its tender texture and mild, subtly sweet flavour. Properly cleaned to remove the beak, quill, and ink sac, our calamari is ready for crispy fried rings, a rich squid curry, or a flavourful stuffed preparation. Best cooked either very quickly or very slowly.",
    image:
      "https://images.unsplash.com/photo-1623855244183-52fd8d3ce2f7?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Squid", price: 18.0, description: "Full squid with head and tentacles" },
      { id: "rings", name: "Rings", price: 22.0, description: "Sliced into rings, ready to fry or grill" },
      { id: "tentacles", name: "Tentacles Only", price: 20.0, description: "Tender tentacles for stir fry" },
      { id: "scored-tubes", name: "Scored Tubes", price: 26.0, description: "Cleaned and scored for even cooking" },
    ],
    origin: "Coromandel Coast, Bay of Bengal",
    nutritionHighlights: ["High Protein 16g/100g", "Low Fat 1.4g", "Rich in Selenium", "Good source of B12"],
  },

  // ══════════════════════════ FISH ══════════════════════════
  {
    id: 5,
    name: "Seer Fish (Vanjaram)",
    category: "Fish",
    price: 32.0,
    priceRange: { min: 28.0, max: 40.0 },
    unit: "kg",
    rating: 4.9,
    reviews: 203,
    badge: "Popular",
    description: "King of fish – firm flesh perfect for fry or curry",
    longDescription:
      "Vanjaram — the undisputed king of Indian coastal fish — is known for its firm, meaty texture and rich flavour that holds up beautifully to bold spices. Our Seer Fish is freshly landed by traditional fishing boats and processed within hours to preserve peak quality. Whether pan-fried to a golden crust, grilled with coastal spices, or slow-simmered in a Chettinad curry, Vanjaram never disappoints.",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Fish", price: 28.0, description: "Full fish, cleaned and scaled" },
      { id: "curry-cut", name: "Curry Cut", price: 30.0, description: "Medium bone-in pieces ideal for curries" },
      { id: "steaks", name: "Thick Steaks", price: 32.0, description: "1-inch thick steaks for fry or grill" },
      { id: "fillets", name: "Boneless Fillets", price: 40.0, description: "100% boneless, premium fillets" },
    ],
    origin: "Bay of Bengal, Rameswaram Fishing Harbour",
    nutritionHighlights: ["High Protein 23g/100g", "Rich in Omega-3", "Good Vitamin D Source", "Low in Saturated Fat"],
  },
  {
    id: 6,
    name: "Atlantic Salmon",
    category: "Fish",
    price: 24.99,
    priceRange: { min: 19.99, max: 28.99 },
    unit: "kg",
    rating: 4.7,
    reviews: 156,
    badge: "Premium",
    description: "Rich, omega-3 packed salmon fillets — grilled or baked",
    longDescription:
      "Our Atlantic Salmon is sourced from certified sustainable farms renowned for producing the richest, most nutritious fillets available. Each fillet is pin-boned and carefully trimmed, offering vibrant coral flesh loaded with heart-healthy omega-3 fatty acids. Perfect for a pan-seared steak, a teriyaki glaze, or simply baked in foil with herbs and lemon.",
    image:
      "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "belly", name: "Belly Strips", price: 19.99, description: "Fatty belly strips, excellent for pan fry" },
      { id: "whole-fillet", name: "Whole Side Fillet", price: 22.99, description: "Full side fillet with skin intact" },
      { id: "steaks", name: "Skin-on Steaks", price: 24.99, description: "Cross-cut steaks with skin for grilling" },
      { id: "skinless-fillet", name: "Skinless Fillets", price: 28.99, description: "Boneless, skinless premium portions" },
    ],
    origin: "Norwegian & Chilean Sustainable Farms",
    nutritionHighlights: ["High Protein 20g/100g", "Very High Omega-3 2.2g", "Rich in Vitamin D", "Good source of B12"],
  },
  {
    id: 7,
    name: "Pomfret (Vavval)",
    category: "Fish",
    price: 28.0,
    priceRange: { min: 24.0, max: 30.0 },
    unit: "kg",
    rating: 4.8,
    reviews: 178,
    badge: "Fresh",
    description: "Silver pomfret with delicate, sweet flesh",
    longDescription:
      "Silver Pomfret — known locally as Vavval — is one of the most prized food fish along India's western coast, beloved for its firm white flesh and delicately sweet, non-fishy flavour. Our pomfret is sourced fresh from boat-to-dock morning catches and cleaned the same day. It's equally delicious whole-fried to a golden crisp or cooked in a tangy Goan recheado masala.",
    image:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Fish", price: 24.0, description: "Full pomfret, cleaned and de-scaled" },
      { id: "cleaned", name: "Cleaned Whole", price: 25.0, description: "Gutted and cleaned, ready to cook" },
      { id: "scored", name: "Scored for Fry", price: 26.0, description: "Cross-scored to absorb marinades deeply" },
      { id: "curry-cut", name: "Curry Cut Pieces", price: 30.0, description: "Cut into 4–6 pieces for curry" },
    ],
    origin: "Konkan Coast & Lakshadweep Waters",
    nutritionHighlights: ["Protein 18g/100g", "Low Calorie 96kcal", "Rich in Phosphorus", "Good Omega-3 Content"],
  },
  {
    id: 8,
    name: "Rohu (Whole)",
    category: "Fish",
    price: 12.5,
    priceRange: { min: 8.0, max: 14.0 },
    unit: "kg",
    rating: 4.4,
    reviews: 89,
    description: "Farm-fresh rohu fish, cleaned and scaled",
    longDescription:
      "Rohu is one of India's most popular freshwater fish, farmed in pristine river-fed aquaculture ponds across West Bengal and Assam. With firm, moderately fatty flesh and a mild, clean flavour, it's the backbone of Bengali fish curries — the classic Macher Jhol. Our Rohu is cleaned and scaled on the same day as delivery, with no added preservatives.",
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "head-tail", name: "Head & Tail", price: 8.0, description: "For flavourful fish head curries" },
      { id: "whole", name: "Whole Fish", price: 10.0, description: "Complete rohu with head and tail" },
      { id: "curry-cut", name: "Curry Cut", price: 11.5, description: "Bone-in medium pieces for curry" },
      { id: "steaks", name: "Steaks / Slices", price: 12.5, description: "Thick cross-cut slices" },
    ],
    origin: "Brahmaputra River Farms, Assam & West Bengal",
    nutritionHighlights: ["Protein 17g/100g", "Low Fat 1.7g", "Good Iron Source", "Rich in Vitamin A"],
  },

  // ══════════════════════════ CHICKEN ══════════════════════════
  {
    id: 9,
    name: "Chicken Breast",
    category: "Chicken",
    price: 12.99,
    priceRange: { min: 10.99, max: 14.99 },
    unit: "kg",
    rating: 4.6,
    reviews: 234,
    badge: "Best Seller",
    description: "Lean, tender chicken breast, skinless and boneless",
    longDescription:
      "Our Farm-Fresh Chicken Breast comes from free-roaming broiler chickens raised on balanced grain diets without added hormones or antibiotics. The breast meat is lean, high in protein, and incredibly versatile — equally at home in a grilled chicken sandwich, a creamy tikka masala, or a quick stir-fry. Each piece is hand-trimmed to remove excess fat before packaging.",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Breast", price: 10.99, description: "Full boneless chicken breast" },
      { id: "butterfly", name: "Butterfly Cut", price: 12.99, description: "Split open for even and quick cooking" },
      { id: "strips", name: "Strips / Fingers", price: 13.99, description: "Long strips for stir fry or grilling" },
      { id: "minced", name: "Minced Breast", price: 14.99, description: "Freshly minced for patties or kebabs" },
    ],
    origin: "Free-Range Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["High Protein 31g/100g", "Very Low Fat 3.6g", "Rich in Vitamin B6", "Good Phosphorus Source"],
  },
  {
    id: 10,
    name: "Chicken Curry Cut",
    category: "Chicken",
    price: 10.5,
    priceRange: { min: 9.99, max: 12.0 },
    unit: "kg",
    rating: 4.5,
    reviews: 189,
    badge: "Popular",
    description: "Perfectly portioned pieces for curries and gravies",
    longDescription:
      "Our Chicken Curry Cut is hand-portioned by skilled butchers to ensure consistent piece sizes that cook evenly and absorb masala perfectly. The bone-in pieces — including breast, thigh, drumstick, and wing portions — are a staple in authentic Indian chicken curries, biryanis, and stews. Sourced from same-day fresh kill for guaranteed quality.",
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "large-12", name: "Large Pieces (12pc)", price: 9.99, description: "Chunky bone-in pieces for slow curries" },
      { id: "medium-16", name: "Medium Pieces (16pc)", price: 10.5, description: "Standard curry cut size" },
      { id: "small-20", name: "Small Pieces (20pc)", price: 11.0, description: "Bite-sized pieces, quick-cooking" },
      { id: "boneless", name: "Boneless Curry Cut", price: 12.0, description: "Boneless pieces for easy eating" },
    ],
    origin: "Certified Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["High Protein 25g/100g", "Moderate Fat 10g", "Rich in B12", "Good Zinc Source"],
  },
  {
    id: 11,
    name: "Whole Chicken",
    category: "Chicken",
    price: 9.99,
    priceRange: { min: 9.99, max: 12.5 },
    unit: "kg",
    rating: 4.4,
    reviews: 145,
    description: "Farm-raised whole chicken, cleaned and dressed",
    longDescription:
      "Raised on clean feed and open-range conditions, our Whole Chicken is slaughtered fresh and dressed on the day of your order. The whole bird gives maximum flexibility — roast it, spatchcock it, or break it down yourself. Ideal for Sunday roasts, slow-cooked gravies, or making a rich homemade chicken stock.",
    image:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Chicken", price: 9.99, description: "Full cleaned and dressed bird" },
      { id: "half", name: "Half Chicken", price: 10.5, description: "Split in half, ideal for grilling" },
      { id: "4-piece", name: "4-Piece Cut", price: 11.0, description: "Quarters: 2 breast + 2 leg pieces" },
      { id: "8-piece", name: "8-Piece Cut", price: 12.5, description: "8 portions: wings, breast, thigh, drumstick" },
    ],
    origin: "Open-Range Farms, Andhra Pradesh",
    nutritionHighlights: ["Protein 22g/100g", "Moderate Fat 12g", "Rich in Niacin", "Good Iron Source"],
  },
  {
    id: 12,
    name: "Chicken Wings",
    category: "Chicken",
    price: 8.99,
    priceRange: { min: 8.0, max: 13.99 },
    unit: "kg",
    rating: 4.7,
    reviews: 267,
    badge: "Popular",
    description: "Meaty wings perfect for grilling, frying or BBQ",
    longDescription:
      "Our Chicken Wings are sourced from young birds known for producing the meatiest, most flavourful wings available. Each pack contains plump, well-proportioned wings perfect for game-day grilling, deep-frying to a golden crunch, or slow-baking until fall-off-the-bone tender. Available with your choice of cut or our signature buffalo marinade.",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "full-wings", name: "Full Wings", price: 8.0, description: "Complete wing with all 3 sections" },
      { id: "wingettes", name: "Wingettes (Mid-Joint)", price: 8.99, description: "Middle section, most meaty" },
      { id: "drumettes", name: "Drumettes", price: 9.5, description: "Drumstick-like mini pieces" },
      { id: "marinated", name: "Buffalo Marinated", price: 13.99, description: "Pre-marinated in spicy buffalo sauce" },
    ],
    origin: "Certified Broiler Farms, Tamilnadu",
    nutritionHighlights: ["Protein 19g/100g", "Moderate Fat 14g", "Rich in Vitamin B6", "Good source of Zinc"],
  },

  // ══════════════════════════ MUTTON ══════════════════════════
  {
    id: 13,
    name: "Mutton Curry Cut",
    category: "Mutton",
    price: 28.0,
    priceRange: { min: 25.0, max: 30.0 },
    unit: "kg",
    rating: 4.7,
    reviews: 167,
    badge: "Popular",
    description: "Tender bone-in pieces, ideal for rich, slow-cooked curries",
    longDescription:
      "Our Mutton is sourced from young, grass-fed goats raised in open pastures, ensuring naturally tender meat with a mild, clean flavour. Hand-cut by experienced butchers into precise curry pieces, each bone-in portion delivers maximum richness when slow-cooked in onion-tomato gravy or pressure-cooked with whole spices.",
    image:
      "https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "small", name: "Small Pieces", price: 25.0, description: "Bite-sized bone-in pieces, quick-cooking" },
      { id: "medium", name: "Medium Pieces", price: 28.0, description: "Standard curry cut size" },
      { id: "large", name: "Large Chunks", price: 27.0, description: "Chunky pieces for slow cooking" },
      { id: "boneless", name: "Boneless Pieces", price: 30.0, description: "Easy-to-eat boneless curry cut" },
    ],
    origin: "Pasture-Fed Farms, Rajasthan & Tamilnadu",
    nutritionHighlights: ["High Protein 25g/100g", "Rich in Iron 3.5mg", "Good Zinc Source", "Rich in B12"],
  },
  {
    id: 14,
    name: "Mutton Chops",
    category: "Mutton",
    price: 32.0,
    priceRange: { min: 30.0, max: 39.0 },
    unit: "kg",
    rating: 4.8,
    reviews: 89,
    badge: "Premium",
    description: "Juicy mutton chops perfect for grilling or pan-frying",
    longDescription:
      "Premium Mutton Chops cut from the loin and rib sections of young, pasture-raised goats. These chops are celebrated for their marbled fat that bastes the meat naturally during high-heat cooking, producing an extraordinarily juicy result. Whether grilled over charcoal, pan-seared with garlic and rosemary, or slow-cooked in Kashmiri rogan josh, our chops are a cut above.",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "thin", name: "Thin Chops (1cm)", price: 30.0, description: "Quick-cooking thin cut for frying" },
      { id: "thick", name: "Thick Chops (2cm)", price: 32.0, description: "Juicy thick cut, ideal for grilling" },
      { id: "rib-chops", name: "Rib Chops", price: 35.0, description: "Premium rib-attached chops" },
      { id: "marinated", name: "Masala Marinated Chops", price: 39.0, description: "Pre-marinated in aromatic spices" },
    ],
    origin: "Grass-Fed Goat Farms, Rajasthan",
    nutritionHighlights: ["Protein 24g/100g", "Rich in Iron 3mg", "Good Zinc Source", "Natural Conjugated Linoleic Acid"],
  },
  {
    id: 15,
    name: "Minced Mutton (Keema)",
    category: "Mutton",
    price: 25.0,
    priceRange: { min: 23.0, max: 29.0 },
    unit: "kg",
    rating: 4.5,
    reviews: 134,
    badge: "Fresh",
    description: "Freshly minced mutton for keema, burgers, and kebabs",
    longDescription:
      "Freshly minced from high-quality young goat meat, our Keema is prepared in small batches to ensure it's never more than a few hours old when it reaches you. The natural fat content provides the moisture and richness needed for perfectly textured kebabs, kheema pav, or stuffed parathas. Available in three grind textures — fine, coarse, and extra lean.",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "fine", name: "Fine Mince", price: 23.0, description: "Finely ground for smooth kebabs and koftas" },
      { id: "coarse", name: "Coarse Mince", price: 25.0, description: "Chunky texture for rustic dishes" },
      { id: "spiced", name: "Spiced Keema Ready", price: 27.0, description: "Pre-spiced with onions and herbs" },
      { id: "extra-lean", name: "Extra Lean Mince", price: 29.0, description: "Fat-trimmed lean mince" },
    ],
    origin: "Butchery Fresh Daily, Chennai & Namakkal",
    nutritionHighlights: ["High Protein 22g/100g", "Rich in Iron 3mg", "Good Zinc Source", "Rich in Vitamin B12"],
  },
  {
    id: 16,
    name: "Mutton Leg (Raan)",
    category: "Mutton",
    price: 22.0,
    priceRange: { min: 20.0, max: 30.0 },
    unit: "kg",
    rating: 4.6,
    reviews: 78,
    description: "Full mutton leg — perfect for festive slow-cook recipes",
    longDescription:
      "The Raan — or mutton leg — is one of the most celebrated cuts in Indian and Middle Eastern cuisine, prized for its large single muscle that takes on marinades beautifully and shreds apart after slow cooking. Our legs come from young, lean goats and are perfectly suited for the famous Dum Ka Raan — a slow-braised preparation that turns the leg fork-tender and infused with aromatic spices.",
    image:
      "https://images.unsplash.com/photo-1585325701165-55c5b2c8f516?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "half-leg", name: "Half Leg", price: 20.0, description: "Half leg portion, easier to handle" },
      { id: "full-leg", name: "Full Leg", price: 22.0, description: "Whole leg for slow roasting" },
      { id: "sliced", name: "Sliced Raan", price: 24.0, description: "Pre-sliced for easy serving" },
      { id: "boneless", name: "Boneless Raan", price: 30.0, description: "Deboned leg for easy carving" },
    ],
    origin: "Pasture-Fed Farms, Rajasthan",
    nutritionHighlights: ["Protein 26g/100g", "Rich in Iron 4mg", "Good Phosphorus Source", "Rich in B Vitamins"],
  },

  // ══════════════════════════ COUNTRY CHICKEN ══════════════════════════
  {
    id: 17,
    name: "Whole Country Chicken",
    category: "Country Chicken",
    price: 22.0,
    priceRange: { min: 20.0, max: 26.0 },
    unit: "kg",
    rating: 4.9,
    reviews: 312,
    badge: "Best Seller",
    description: "Free-range country chicken — rich, natural village flavour",
    longDescription:
      "Our Country Chicken (Nattu Kozhi) is raised the traditional way — free-ranging in open farmyards on natural grain and grass feed, completely free from growth hormones and antibiotics. The slow-growing nature of these birds produces leaner, firmer meat with a depth of flavour that regular broiler chicken simply cannot match. In Tamil Nadu, Nattu Kozhi is the gold standard for Chettinad curries and festival biryanis.",
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "whole", name: "Whole Bird", price: 20.0, description: "Full free-range country chicken" },
      { id: "half", name: "Half Bird", price: 21.0, description: "Split in half, easy portion" },
      { id: "4-piece", name: "4-Piece Cut", price: 22.0, description: "Quartered into 4 pieces" },
      { id: "skinless", name: "Skinless Whole", price: 26.0, description: "Skin removed for lighter dishes" },
    ],
    origin: "Free-Range Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["Protein 23g/100g", "Low Natural Fat 2.5g", "Rich in B Vitamins", "High Potassium"],
  },
  {
    id: 18,
    name: "Country Chicken Curry Cut",
    category: "Country Chicken",
    price: 24.0,
    priceRange: { min: 22.0, max: 27.0 },
    unit: "kg",
    rating: 4.8,
    reviews: 198,
    badge: "Popular",
    description: "Country chicken cut into curry pieces — flavorful and tender",
    longDescription:
      "Sourced from authentic free-range farms in Namakkal — India's poultry capital — our Country Chicken Curry Cut delivers the legendary village-fresh taste that has made Nattu Kozhi a prized ingredient in South Indian kitchens. Each piece is hand-cut to optimal size, ensuring the bone-in pieces cook evenly and absorb the masala deeply for an unforgettable flavour.",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "8-piece", name: "8-Piece Cut", price: 22.0, description: "Large bone-in pieces for slow curries" },
      { id: "12-piece", name: "12-Piece Cut", price: 24.0, description: "Standard curry cut" },
      { id: "16-piece", name: "16-Piece Cut", price: 25.0, description: "Smaller pieces, cook faster" },
      { id: "boneless", name: "Boneless Curry Cut", price: 27.0, description: "Easy-to-eat boneless pieces" },
    ],
    origin: "Free-Range Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["Protein 22g/100g", "Low Natural Fat", "Rich in B6 & B12", "Good Iron Source"],
  },
  {
    id: 19,
    name: "Country Chicken Boneless",
    category: "Country Chicken",
    price: 30.0,
    priceRange: { min: 27.0, max: 33.0 },
    unit: "kg",
    rating: 4.7,
    reviews: 143,
    badge: "Premium",
    description: "Boneless country chicken pieces, versatile and delicious",
    longDescription:
      "Premium boneless cuts from free-range country chickens, carefully deboned by hand to ensure zero bone fragments. The natural diet and active lifestyle of these birds produces meat with a firm bite and a rich, distinct flavour profile that makes it a worthy upgrade in any recipe calling for boneless chicken. Perfect for rolls, pasta, or a quick stir-fry.",
    image:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "minced", name: "Minced", price: 27.0, description: "Freshly minced country chicken" },
      { id: "full-boneless", name: "Full Boneless", price: 28.0, description: "Complete boneless chicken" },
      { id: "strips", name: "Boneless Strips", price: 30.0, description: "Long strips for stir fry" },
      { id: "cubes", name: "Boneless Cubes", price: 33.0, description: "Diced pieces for curries and kebabs" },
    ],
    origin: "Free-Range Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["Protein 24g/100g", "Very Low Natural Fat", "Rich in Niacin", "Good Selenium Source"],
  },
  {
    id: 20,
    name: "Country Chicken Legs",
    category: "Country Chicken",
    price: 26.0,
    priceRange: { min: 24.0, max: 30.0 },
    unit: "kg",
    rating: 4.8,
    reviews: 176,
    badge: "Fresh",
    description: "Meaty country chicken legs with rich, natural taste",
    longDescription:
      "Full, meaty legs from free-range country chickens — each one plump and firm from a lifetime of natural foraging. These legs are ideal for slow curries, grilled preparations, or the beloved Tamil Nadu-style Chicken Leg Fry that turns these cuts into a crispy, spice-coated masterpiece. Naturally richer in flavour than broiler legs, they're worth every bite.",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
    cuts: [
      { id: "full-legs", name: "Full Legs", price: 24.0, description: "Complete leg with thigh attached" },
      { id: "thigh-drumstick", name: "Thigh & Drumstick", price: 25.0, description: "Thigh-drumstick combination" },
      { id: "drumsticks", name: "Drumsticks Only", price: 26.0, description: "Lower leg drumsticks" },
      { id: "marinated", name: "Masala Marinated Legs", price: 30.0, description: "Pre-marinated in traditional spices" },
    ],
    origin: "Free-Range Farms, Namakkal, Tamilnadu",
    nutritionHighlights: ["Protein 20g/100g", "Moderate Natural Fat", "Rich in Zinc", "Good Iron Source"],
  },
];
