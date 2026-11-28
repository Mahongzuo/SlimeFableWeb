// Species definitions from fishing-3d.
export const referenceFish = [
  {
    "id": "reed_perch",
    "name": "Reed Perch",
    "minCm": 38,
    "maxCm": 52,
    "flavorText": "waits under the weed",
    "colorHex": "#5C7A4B",
    "accentHex": "#D9E3C8",
    "habitat": "shallows",
    "preferredPhases": [
      "dawn",
      "midday",
      "golden"
    ],
    "rarity": "common",
    "trophyCm": 49,
    "loreHint": "Cruises calmly near lily pads and mossy submerged boulders during daylight.",
    "finHex": "#92A86E",
    "pattern": "bars"
  },
  {
    "id": "sunlit_bluegill",
    "name": "Sunlit Bluegill",
    "minCm": 20,
    "maxCm": 31,
    "flavorText": "flashes copper beside the reeds",
    "colorHex": "#3B7D8C",
    "accentHex": "#F2B866",
    "habitat": "shallows",
    "preferredPhases": [
      "dawn",
      "midday"
    ],
    "rarity": "common",
    "trophyCm": 29,
    "loreHint": "Basks in bright sunbeams along the lily-fringed shallows at dawn and midday.",
    "finHex": "#E09D4F",
    "pattern": "bars"
  },
  {
    "id": "pond_darter",
    "name": "Pond Darter",
    "minCm": 24,
    "maxCm": 34,
    "flavorText": "skims the sunlit stone",
    "colorHex": "#2B9EB3",
    "accentHex": "#B8F2E6",
    "habitat": "shallows",
    "preferredPhases": [
      "midday",
      "golden"
    ],
    "rarity": "common",
    "trophyCm": 32,
    "loreHint": "Darts briskly across sunlit stone shelves in clear shallow water.",
    "finHex": "#7DD6DE",
    "pattern": "iridescent"
  },
  {
    "id": "mossback_bullhead",
    "name": "Mossback Bullhead",
    "minCm": 32,
    "maxCm": 46,
    "flavorText": "dozes where the silt runs cool",
    "colorHex": "#6A6546",
    "accentHex": "#D4C89E",
    "habitat": "shallows",
    "preferredPhases": [
      "dawn",
      "golden",
      "starlight"
    ],
    "rainBonus": true,
    "rarity": "uncommon",
    "trophyCm": 43,
    "loreHint": "Stirs from shaded willow margins in low light, especially during gentle rain.",
    "finHex": "#8C8158",
    "pattern": "spots"
  },
  {
    "id": "brook_trout",
    "name": "Brook Trout",
    "minCm": 34,
    "maxCm": 50,
    "flavorText": "dances where the spring runs cold",
    "colorHex": "#4E7A65",
    "accentHex": "#F08C5B",
    "habitat": "waterfall",
    "preferredPhases": [
      "dawn",
      "midday"
    ],
    "rainBonus": true,
    "rarity": "uncommon",
    "trophyCm": 47,
    "loreHint": "Hunts the aerated bubbles below the north spring waterfall at dawn and midday.",
    "finHex": "#E57A4D",
    "pattern": "spots"
  },
  {
    "id": "copper_loach",
    "name": "Copper Loach",
    "minCm": 28,
    "maxCm": 40,
    "flavorText": "glints like a dropped penny in foam",
    "colorHex": "#B86E3E",
    "accentHex": "#F3D2A6",
    "habitat": "waterfall",
    "preferredPhases": [
      "dawn",
      "golden",
      "starlight"
    ],
    "rainBonus": true,
    "rarity": "uncommon",
    "trophyCm": 38,
    "loreHint": "Weaves along the tumbling stone ledges beneath the waterfall, thriving in rain.",
    "finHex": "#D9945E",
    "pattern": "bars"
  },
  {
    "id": "riffle_salmon",
    "name": "Riffle Salmon",
    "minCm": 58,
    "maxCm": 76,
    "flavorText": "leaps into the silver spray",
    "colorHex": "#56788C",
    "accentHex": "#E6927E",
    "habitat": "waterfall",
    "preferredPhases": [
      "dawn",
      "golden"
    ],
    "rainBonus": true,
    "rarity": "rare",
    "trophyCm": 72,
    "loreHint": "A proud jumper drawn to the waterfall plunge basin at dawn, golden hour, and rain.",
    "finHex": "#C97B6B",
    "pattern": "spots"
  },
  {
    "id": "lantern_carp",
    "name": "Lantern Carp",
    "minCm": 72,
    "maxCm": 88,
    "flavorText": "rises when the light goes gold",
    "colorHex": "#F4A236",
    "accentHex": "#FFF3D1",
    "minTimeOfDay": 0.65,
    "habitat": "deep",
    "preferredPhases": [
      "golden",
      "starlight"
    ],
    "rarity": "rare",
    "trophyCm": 84,
    "loreHint": "Sleeps in the deep channel until Golden Hour or Starlight summons its amber glow.",
    "finHex": "#FFF5DC",
    "pattern": "glow"
  },
  {
    "id": "amber_koi",
    "name": "Amber Koi",
    "minCm": 54,
    "maxCm": 72,
    "flavorText": "carries autumn brush-strokes on its back",
    "colorHex": "#E86A33",
    "accentHex": "#FFF7E8",
    "habitat": "deep",
    "preferredPhases": [
      "midday",
      "golden"
    ],
    "rarity": "uncommon",
    "trophyCm": 68,
    "loreHint": "Glides gracefully through open deep water and near the Boathouse pilings.",
    "finHex": "#FBE8CC",
    "pattern": "koi"
  },
  {
    "id": "velvet_catfish",
    "name": "Velvet Catfish",
    "minCm": 64,
    "maxCm": 86,
    "flavorText": "listens to raindrops on the hull",
    "colorHex": "#434E5E",
    "accentHex": "#A7B8C9",
    "habitat": "deep",
    "preferredPhases": [
      "golden",
      "starlight"
    ],
    "rainBonus": true,
    "rarity": "rare",
    "trophyCm": 82,
    "loreHint": "A whiskered deep-basin giant most active after dusk and whenever rain patters down.",
    "finHex": "#6E7D91",
    "pattern": "iridescent"
  },
  {
    "id": "moonveil_glassfish",
    "name": "Moonveil Glassfish",
    "minCm": 30,
    "maxCm": 42,
    "flavorText": "holds a sliver of starlight in its ribs",
    "colorHex": "#59C7E0",
    "accentHex": "#D8F8FF",
    "habitat": "mythic",
    "preferredPhases": [
      "starlight",
      "dawn"
    ],
    "rainBonus": true,
    "rarity": "mythic",
    "trophyCm": 39,
    "loreHint": "Emerges in the deep pool under Starlight or early dawn mist, shimmering like spun glass.",
    "finHex": "#B8F3FF",
    "pattern": "translucent"
  },
  {
    "id": "celestial_oarcarp",
    "name": "Celestial Oar-Carp",
    "minCm": 92,
    "maxCm": 118,
    "flavorText": "trails ribbons of liquid gold through starlit water",
    "colorHex": "#F7C948",
    "accentHex": "#92E6FF",
    "habitat": "mythic",
    "preferredPhases": [
      "golden",
      "starlight"
    ],
    "rarity": "mythic",
    "trophyCm": 112,
    "loreHint": "The cove’s fabled guardian—drawn to the Lantern Fly in deep waters at Golden Hour or Starlight.",
    "finHex": "#FFF0B8",
    "pattern": "glow"
  }
];
