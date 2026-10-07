import { formatFizkesPopovTitle } from "./gemini";

interface RandomBackgroundResult {
  prompt: string;
  title: string;
}

// Full array of 300+ premium microstock themes requested by the user
const ALL_BACKGROUND_THEMES = [
  "Isometric Architectural Pillars",
  "Liquid Metal Silk Waves",
  "Sacred Geometric Mandala Lattice",
  "Low-Poly Origami Terrain",
  "Neomorphic Tactile Waves",
  "Abstract Glass Morphism Layers",
  "Crystal Prism Refraction",
  "Gradient Mesh Flow",
  "Futuristic Hexagon Matrix",
  "Minimal Cubic Landscape",
  "Floating Geometric Platforms",
  "Luxury Marble Veins",
  "Golden Wireframe Network",
  "Paper Cut Layered Landscape",
  "Parametric Ribbon Surface",
  "Abstract Fluid Blob Network",
  "Pearlescent Organic Forms",
  "Reflective Chrome Fabric",
  "Luxury Satin Folds",
  "Volumetric Light Beams",
  "Neon Energy Tunnel",
  "Infinity Grid Perspective",
  "Digital Particle Field",
  "Floating Crystal Cluster",
  "Polygon Mountain Range",
  "Topographic Contour Lines",
  "Wave Interference Pattern",
  "Moiré Optical Illusion",
  "Concentric Ripple Rings",
  "Radial Energy Burst",
  "Dynamic Spiral Vortex",
  "Hexagonal Honeycomb Depth",
  "Cube Stack Illusion",
  "Voxel City Blocks",
  "Isometric Floating Islands",
  "Mechanical Gear Matrix",
  "Industrial Steel Panels",
  "Sci-Fi Circuit Pathways",
  "AI Neural Connections",
  "Quantum Data Streams",
  "Cyber Grid Horizon",
  "Futuristic Portal Rings",
  "Energy Pulse Lattice",
  "Laser Beam Network",
  "Digital Rain Matrix",
  "Wireframe Terrain",
  "Glass Cube Array",
  "Prismatic Polygon Field",
  "Diamond Facet Surface",
  "Gemstone Mosaic",
  "Crystal Ice Formation",
  "Snowflake Geometry",
  "Frozen Glass Texture",
  "Water Ripple Surface",
  "Ocean Wave Abstraction",
  "Liquid Ink Flow",
  "Acrylic Paint Swirls",
  "Alcohol Ink Texture",
  "Oil Paint Marbling",
  "Cloud Vapor Layers",
  "Smoke Ribbon Motion",
  "Volcanic Lava Flow",
  "Molten Rock Surface",
  "Solar Plasma Waves",
  "Galaxy Nebula Clouds",
  "Cosmic Dust Field",
  "Star Particle Ocean",
  "Celestial Sphere Grid",
  "Planetary Orbit Lines",
  "Aurora Light Curtains",
  "Meteor Trail Network",
  "Space-Time Warp",
  "Black Hole Distortion",
  "Gravity Wave Mesh",
  "Fractal Bloom Pattern",
  "Recursive Geometry",
  "Procedural Noise Surface",
  "Algorithmic Mesh Waves",
  "Generative Line Art",
  "Mathematical Tessellation",
  "Voronoi Cell Network",
  "Delaunay Triangle Mesh",
  "Penrose Tile Pattern",
  "Escher Inspired Geometry",
  "Impossible Cube Structure",
  "Optical Cube Illusion",
  "Floating Staircase",
  "Infinity Loop Structure",
  "Architectural Facade Grid",
  "Modern Concrete Panels",
  "Brutalist Geometry",
  "Minimal Interior Shadows",
  "Luxury Wall Panels",
  "Decorative Ceiling Pattern",
  "Ornamental Islamic Geometry",
  "Japanese Kumiko Pattern",
  "Celtic Knot Network",
  "Art Deco Geometry",
  "Bauhaus Composition",
  "Memphis Abstract Shapes",
  "Swiss Grid Layout",
  "Mid-Century Modern Curves",
  "Scandinavian Minimal Forms",
  "Zen Sand Patterns",
  "Rock Garden Geometry",
  "Bamboo Layer Design",
  "Lotus Petal Arrangement",
  "Botanical Leaf Pattern",
  "Tropical Palm Geometry",
  "Floral Mandala Bloom",
  "Rose Petal Layers",
  "Cherry Blossom Flow",
  "Autumn Leaf Spiral",
  "Feather Layer Texture",
  "Butterfly Wing Pattern",
  "Dragon Scale Texture",
  "Snake Skin Geometry",
  "Fish Scale Mosaic",
  "Coral Reef Pattern",
  "Shell Spiral Geometry",
  "Pearl Cluster Design",
  "Honey Drip Surface",
  "Wax Melt Texture",
  "Velvet Fabric Waves",
  "Linen Textile Pattern",
  "Leather Stitch Surface",
  "Carbon Fiber Texture",
  "Kevlar Weave Pattern",
  "Titanium Panel Design",
  "Copper Oxidation Texture",
  "Brushed Aluminum Surface",
  "Anodized Metal Finish",
  "Brass Decorative Grid",
  "Silver Mirror Mosaic",
  "Gold Foil Texture",
  "Rose Gold Surface",
  "Holographic Film Pattern",
  "Iridescent Surface Flow",
  "Opal Stone Reflection",
  "Quartz Crystal Texture",
  "Amethyst Cluster Design",
  "Emerald Faceted Pattern",
  "Ruby Prism Layout",
  "Sapphire Crystal Surface",
  "Obsidian Glass Texture",
  "Basalt Rock Pattern",
  "Granite Stone Geometry",
  "Terrazzo Surface Design",
  "Concrete Aggregate Texture",
  "Ceramic Tile Mosaic",
  "Porcelain Surface Waves",
  "Mosaic Glass Pattern",
  "Stained Glass Geometry",
  "Window Reflection Grid",
  "Skylight Shadow Pattern",
  "Curtain Fold Waves",
  "Blind Shadow Stripes",
  "Sunlight Projection",
  "Soft Ambient Shadows",
  "Long Shadow Geometry",
  "Layered Shadow Blocks",
  "Depth Extrusion Illusion",
  "Fake Ambient Occlusion",
  "Contact Shadow Layers",
  "Perspective Shadow Grid",
  "Floating Frame System",
  "Stacked Card Layout",
  "Floating Window Panels",
  "HUD Free Tech Panels",
  "Minimal Interface Layers",
  "Dashboard Tile Pattern",
  "Infographic Geometry",
  "Presentation Stage Design",
  "Award Ceremony Background",
  "Luxury Event Backdrop",
  "Premium Studio Wall",
  "Broadcast News Background",
  "Virtual Conference Stage",
  "Podcast Studio Panels",
  "Corporate Motion Background",
  "Business Wave Design",
  "Financial Growth Lines",
  "Stock Market Mesh",
  "Global Connection Map",
  "World Grid Network",
  "Digital Globe Surface",
  "Latitude Longitude Mesh",
  "Earth Topography",
  "Satellite Signal Waves",
  "Communication Network",
  "Signal Pulse Rings",
  "Audio Spectrum Waves",
  "Equalizer Bar Geometry",
  "Sound Wave Tunnel",
  "Frequency Ripple Pattern",
  "Music Visualizer Mesh",
  "Vinyl Groove Texture",
  "Piano Key Geometry",
  "String Wave Pattern",
  "Electric Guitar Flow",
  "Festival Light Beams",
  "Concert Laser Grid",
  "Stage Spotlight Rays",
  "Firework Particle Burst",
  "Celebration Confetti Flow",
  "Luxury Bokeh Lights",
  "Elegant Sparkle Field",
  "Glitter Dust Waves",
  "Diamond Dust Motion",
  "Magic Particle Swirl",
  "Fantasy Crystal Forest",
  "Mystic Energy Circles",
  "Arcane Symbol Grid",
  "Rune Stone Pattern",
  "Ancient Temple Geometry",
  "Roman Column Perspective",
  "Greek Marble Architecture",
  "Egyptian Golden Pattern",
  "Aztec Geometric Mosaic",
  "Mayan Stone Relief",
  "Nordic Rune Background",
  "Japanese Temple Layers",
  "Chinese Lattice Window",
  "Arabic Mosaic Pattern",
  "Indian Rangoli Geometry",
  "African Tribal Pattern",
  "Ocean Current Flow",
  "Wind Stream Lines",
  "Sand Dune Landscape",
  "Desert Wave Texture",
  "Iceberg Polygon Surface",
  "Forest Canopy Pattern",
  "Mountain Ridge Layers",
  "River Meander Pattern",
  "Waterfall Mist Layers",
  "Rain Droplet Ripples",
  "Lightning Energy Branches",
  "Thunder Cloud Layers",
  "Sunbeam Volume Rays",
  "Moonlight Reflection",
  "Solar Eclipse Rings",
  "Lunar Surface Texture",
  "Planet Ring Geometry",
  "Asteroid Belt Pattern",
  "Meteor Crystal Field",
  "Comet Tail Flow",
  "Space Dock Geometry",
  "Orbital Ring Station",
  "Satellite Solar Panels",
  "Space Habitat Interior",
  "Lunar Base Modules",
  "Mars Colony Layout",
  "Planetary Dome City",
  "Sci-Fi Megastructure",
  "Dyson Sphere Pattern",
  "Ringworld Geometry",
  "Warp Corridor Design",
  "Hyperspace Tunnel",
  "Quantum Gateway",
  "Portal Energy Surface",
  "Time Portal Geometry",
  "Chrono Wave Pattern",
  "Temporal Distortion Grid",
  "AI Neural Mesh",
  "Artificial Synapse Pattern",
  "Machine Intelligence Grid",
  "Deep Learning Network",
  "Digital Consciousness",
  "Virtual Reality Space",
  "Augmented Reality Grid",
  "Mixed Reality Surface",
  "Metaverse Architecture",
  "Cyber Dimension",
  "Data Stream River",
  "Code Matrix Surface",
  "Binary Rain Waves",
  "Algorithm Flow Pattern",
  "Logic Gate Geometry",
  "Processor Die Layout",
  "CPU Core Surface",
  "GPU Circuit Pattern",
  "Memory Cell Grid",
  "Storage Block Pattern",
  "Cloud Infrastructure",
  "Edge Computing Network",
  "Server Cluster Geometry",
  "Data Pipeline Surface",
  "Blockchain Node Matrix",
  "Cryptographic Pattern",
  "Cyber Defense Shield",
  "Secure Data Vault",
  "Identity Network Grid",
  "Authentication Pattern",
  "Digital Fingerprint Waves",
  "Biometric Mesh",
  "Face Recognition Grid",
  "Iris Scan Pattern",
  "Retina Geometry",
  "Medical Interface Background",
  "Health Technology Surface",
  "Bioinformatics Grid",
  "Genomic Visualization",
  "DNA Crystal Pattern",
  "Protein Molecule Surface",
  "Enzyme Structure Abstract",
  "Microbiology Pattern",
  "Cell Division Geometry",
  "Stem Cell Network",
  "Neuron Cluster Surface",
  "Brain Cortex Pattern",
  "Consciousness Waves",
  "Dreamscape Geometry",
  "Mind Map Surface",
  "Creativity Flow Pattern",
  "Innovation Burst Geometry",
  "Knowledge Network",
  "Education Abstract",
  "Research Visualization",
  "Scientific Discovery Background",
  "Future Laboratory Design",
  "Robotics Interface",
  "Automation Dashboard",
  "Autonomous Systems Pattern",
  "Electric Mobility Surface",
  "Battery Cell Geometry",
  "Energy Storage Grid",
  "Renewable Energy Pattern",
  "Solar Cell Matrix",
  "Wind Turbine Abstract",
  "Hydrogen Energy Surface",
  "Green Technology Pattern",
  "Circular Economy Visualization",
  "Sustainability Geometry",
  "Eco Innovation Surface",
  "Clean Energy Waves",
  "Nature Technology Fusion",
  "Bio Digital Harmony",
  "Future Civilization Background",
  "Next Era Geometry",
  "Visionary Abstract Landscape",
  "Ultra Premium Motion Background",
  "Luxury Motion Design",
  "Editorial Background Texture",
  "Broadcast Motion Surface",
  "Presentation Motion Canvas",
  "Corporate Hero Background",
  "Microstock Premium Background",
  "Adobe Stock Bestseller Style",
  "Shutterstock Trending Background",
  "Pond5 Premium Abstract",
  "Motion Array Style Background",
  "Creative Market Abstract",
  "Premium Visual Backdrop",
  "Designer Showcase Background",
  "Modern Showcase Surface",
  "Luxury Display Background"
];

const STYLES_POOL = [
  "3D Isometric Shading",
  "Kinetic Constructivism",
  "Prismatic Refraction",
  "Liquid Glassmorphism",
  "Organic Minimalism",
  "Futuristic Cyberpunk Grid",
  "Luxurious Satin Shading",
  "Faceted Low-Poly",
  "Sacred Geometry",
  "Fluid Dynamics",
  "Neo-Gothic Brutalism",
  "Ethereal Parallax",
  "Parametric Ribbon Art",
  "Tactile Neomorphism",
  "Abstract Surrealism",
  "Volumetric Vector Shading",
  "Metallic Chrome Luster",
  "Matte Velvet Overlay",
  "Mathematical Sine Topology",
  "Holographic Glare Effect",
  "Generative Voronoi Tessellation",
  "Chroma-Shift Dispersion",
  "Moiré Optical Illusion",
  "Anharmonic Wave Interference",
  "Glassmorphic Depth Occlusion"
];

const COLORS_POOL = [
  "Deep Obsidian & Gold Dust & Warm Amber & Ebony Silk & Bronze Highlights",
  "Emerald Aurora & Mint Platinum & Deep Forest Teal & Sage Velvet & Silver Sparks",
  "Royal Ultraviolet & Electric Cobalt & Nebula Pink & Deep Indigo & Neon Violet Glow",
  "Warm Copper & Burnt Sienna & Dusty Terracotta & Crimson Shadow & Sandy Ochre",
  "Polar Ice & Teal Marine & Deep Navy & Frosted Aqua & Glacier Blue Highlights",
  "Vaporwave Pink & Cyber Magenta & Deep Violet & Laser Cyan & Purple Twilight",
  "Champagne Velvet & Charcoal Silk & Soft Pewter & Warm Ivory & Gold Leaf Glare",
  "Saffron Honey & Ebony Bronze & Amber Dust & Roasted Terracotta & Charcoal Shadow",
  "Midnight Navy & Cerulean Sparks & Cobalt Shadow & Turquoise Glow & Deep Indigo",
  "Jade Forest & Sage Sage & Platinum Emerald & Moss Shadow & Mint Velvet Glow",
  "Crimson Wine & Rose Gold & Plum Jam & Deep Velvet Burgundy & Platinum Shimmer",
  "Burnished Bronze & Metallic Brass & Metallic Gold & Ebony Charcoal & Ivory Frost"
];export function generateRandomMicrostockBackgroundPrompt(
  isPremium3D: boolean = true,
  conceptText?: string,
  selectedIconStyle?: string,
  variationIndex: number = 0,
  usedArchetypes: string[] = []
): RandomBackgroundResult {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 100000);
  const uniqueSeed = `BG-VAR${variationIndex + 1}-${timestamp}-${randomValue}`;

  const selectedArchetype = getUniqueRandomArchetype(usedArchetypes);

  // Decide how many themes to combine: 3 to 5 themes
  const numThemes = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5

  // Shuffle the themes list and select the requested number of themes, blending in 1000+ directions
  const shuffledThemes = [...ALL_BACKGROUND_THEMES, ...VISUAL_DIRECTIONS_1000].sort(() => 0.5 - Math.random());
  const selectedThemes = shuffledThemes.slice(0, numThemes);

  if (conceptText && conceptText.trim()) {
    selectedThemes[0] = conceptText.trim();
  }

  // Generate a composite title following Fizkes & Andrey Popov commercial formula
  const compositeTheme = selectedThemes.join(" and ");
  const cleanTitle = formatFizkesPopovTitle(compositeTheme, {
    brief: compositeTheme,
    is3D: isPremium3D,
  });

  // Choose 5 random styles, drawing from both the styles pool and the 1000+ list to maximize uniqueness
  const shuffledStyles = [...STYLES_POOL, ...VISUAL_DIRECTIONS_1000].sort(() => 0.5 - Math.random());
  if (selectedIconStyle && selectedIconStyle.trim()) {
    shuffledStyles.unshift(selectedIconStyle.trim());
  }
  const selectedStyles = shuffledStyles.slice(0, 5).join(", ");

  // Choose a random rich color palette
  const colorIndex = (variationIndex + randomValue) % COLORS_POOL.length;
  const selectedColors = COLORS_POOL[colorIndex];

  // Dynamic parameters for formulas to enforce strict mathematical variety
  const speedVal = (0.2 + Math.random() * 0.8).toFixed(2);
  const ampVal = Math.floor(50 + Math.random() * 100);
  const freqVal = (0.05 + Math.random() * 0.35).toFixed(3);
  const angleOffset = Math.floor(Math.random() * 360);

  // Build custom narrative explaining the harmonious blending of chosen themes
  const themeListIndonesian = selectedThemes.map((t, idx) => `${idx + 1}. ${t}`).join("\n  ");
  
  const visualFlowDesc = `Integrasikan secara sinergis dan harmonis ${numThemes} konsep berikut dengan arketipe struktur "${selectedArchetype}":
  ${themeListIndonesian}
  
  Rancang struktur kanvas berbasis arketipe "${selectedArchetype}" yang memadukan keindahan abstrak geometris, kontur dinamis, dan kedalaman berlapis dari masing-masing konsep di atas. Tidak boleh ada satu pun bagian yang terpisah secara kasar; gabungkan elemen tersebut menjadi kesatuan latar belakang premium yang mengalir anggun.`;

  const depthDirective = isPremium3D
    ? `4. WAJIB selalu menggunakan TEKNIK SEMI 3D di setiap elemen untuk memberikan efek kedalaman visual, timbul, berdimensi, dan volume tinggi yang mewah.`
    : `4. WAJIB selalu menggunakan TEKNIK FLAT 2D MODERN di setiap elemen untuk memberikan efek estetika grafis 2D minimalis yang bersih, elegan, tanpa efek timbul, tanpa extrude, dan tanpa bayangan tebal.`;

  const depthDetails = isPremium3D
    ? `- Ilusi Kedalaman: Menggunakan teknik semi 3D murni. Setiap sisi pilar, riak, gelombang logam cair, lekukan sutra, atau lipatan geometris menggunakan gradien warna yang sangat berbeda secara kontras tinggi dengan warna yang sangat vibrant: sisi kiri menggunakan gradien terang kemilau berpendar tinggi (vibrant bright side), sisi depan menggunakan warna transisi medium yang hidup (vibrant middle), dan sisi kanan/bawah diselimuti gradien bayangan jatuh (deep shadow) yang tebal untuk mensimulasikan volume semi 3D murni dan kedalaman fisik berlapis.`
    : `- Tampilan Visual 2D Datar: Menggunakan gaya vector flat modern 2D murni. Setiap elemen, riak, atau gelombang dirancang sebagai bentuk 2D datar dengan gradasi warna linear/radial dua dimensi yang halus tanpa bayangan jatuh tebal, tanpa efek timbul (no emboss), tanpa shading volume 3D, menghasilkan estetika desain poster digital kontemporer yang bersih dan elegan.`;

  const styleDetails = isPremium3D
    ? `- Style: ${selectedStyles}, Semi 3D Depth, High Contrast Shading`
    : `- Style: ${selectedStyles}, Flat 2D Minimalist Vector, Smooth 2D Linear Gradients`;

  const finalPrompt = `KOMPOSISI HARMONIS MULTI-TEMA (VARIASI KE-${variationIndex + 1} - ARKETIPE: ${selectedArchetype}): ${selectedThemes.join(" x ")}
  
  SANGAT PENTING: JANGAN SEKALI-KALI menambahkan elemen HUD (Heads-Up Display) atau panel kontrol apa pun seperti:
  - Informasi FPS, Current frame, Timeline, Playback controls, Safe area, Bounding box elemen, Debug information, dan HUD overlays.
  
  ARKETIPE VISUAL DAN GEOMETRI:
  - Bentuk visual dan struktur kanvas WAJIB BERADAPTASI KHUSUS TERHADAP ARKETIPE "${selectedArchetype}".
  - JANGAN MEMAKSAKAN GELOMBANG/WAVE jika arketipe adalah kisi/grid geometris, jaringan titik konstelasi, kristal 3D, kubus isometrik, lipatan origami, atau Voronoi!
  
  ATURAN ELEMEN & KANVAS:
  1. Hanya gunakan komponen path vector SVG premium dan matematika murni (trigonometri, kurva Bezier kompleks, dll.).
  2. TIDAK BOLEH ada subjek dan objek utama (seperti manusia, hewan, produk, mobil, ikon tunggal, dll.) karena ditujukan khusus untuk background abstrak.
  3. Latar belakang TIDAK BOLEH berupa warna solid polos atau datar. Seluruh elemen wajib kaya, berlapis-lapis, dan bernilai premium.
  ${depthDirective}
  5. Semua gradasi warna, bias cahaya, pencahayaan specular, dan highlight wajib bernilai tinggi dengan tingkat saturasi optimal dan menggunakan pilihan WARNA YANG VIBRANT (sangat hidup, menyala, kaya rona, kontras tinggi, anti-pucat).
  
  KONSEP ANIMASI BACKGROUND ILUSTRASI:
  - Alur Visual: ${visualFlowDesc}
  
  ${depthDetails}
  
  - Gerakan: Rotasi fasa tergeser, pergerakan harmonis diagonal dengan sudut offset ${angleOffset} derajat, multiplier kecepatan dinamis ${speedVal}x, frekuensi harmonik ${freqVal}Hz, dan simpangan amplitudo dinamis sebesar ${ampVal}px. Each element animates with 60 FPS smooth continuous loop.
  
  - Edge-to-Edge: Wajib memenuhi keempat sudut frame 4K (3840x2160) dari sudut ke sudut secara presisi (surface) tanpa celah latar belakang polos atau kosong sedikit pun.
  
  ${styleDetails}
  
  - Color must be: ${selectedColors} (Wajib menggunakan paduan warna yang sangat VIBRANT, bersaturasi tinggi, berpendar, hidup, dan kontras)
  
  - Text: non text, non number, non currency. Sama sekali tidak boleh ada huruf, kata, angka, atau simbol mata uang dalam bentuk apa pun.
  
  MANDATORI DILARANG ELEMEN DISTRAKSI / LIGHT STREAK / LENS FLARE / BOKEH DOTS:
  - DILARANG KERAS MEMBUAT ELEMEN KILAUAN CAHAYA BERJALAN, TRAVELLING LIGHT PULSE, HORIZONTAL LENS FLARE SCANNING, SPOTLIGHT SWEEP, BOKEH CIRCLES / BINTIK CAHAYA FLOATING, ATAU LIGHT BEAM YANG MELINTAS DARI KIRI KE KANAN FRAME DI TENGAH CANVAS.
  - SELURUH PERMUKAAN LALUAN DAN ELEMEN WAJIB CLEAN, UNIFORM, SMOOTH, ELEGAN, DAN TERSTABILISASI SEBAGAI BACKGROUND SURFACE MURNI TANPA BINTIK CAHAYA ATAU FLARE DISTRAKSI DI TENGAH FRAME.
  
  ATURAN NON-REPETISI & UNIK (MANDATORI):
  - Gunakan SEED ID UNIK berikut untuk mendrive nilai matematika acak: "${uniqueSeed}".
  - JANGAN PERNAH menduplikasi atau meniru struktur kode dari variasi lain.
  - Setiap variasi wajib melahirkan jalur matematika vektor baru berbasis arketipe "${selectedArchetype}".
  `;

  return {
    prompt: finalPrompt,
    title: cleanTitle
  };
}

// User's categorized premium lists representing 9 distinct visual layers for professional-grade outputs
const USER_THEMES = [
  "Server Network", "Recursive Spiral Tunnel", "Engraved Metal Surface", "Mirror Crystal Tunnel", 
  "Technical Blueprint Grid", "Navigation Grid", "Storm Clouds", "Liquid Glass Sheets", 
  "Fabric Geometry", "Metallic Light Waves", "Snowfall Particle Field", "Sci-Fi AI Brain", 
  "Stacked Card Layout", "Tetrahedron Field", "Layered Glass Relief", "Award Ceremony Lights", 
  "Wave Ribbon Canopy", "Cloud Server Network", "Vinyl Groove Texture", "Marine Particle Field", 
  "Innovation Network Grid", "Fluid Crystal Sheets", "Bio Luminescent Forest", "Glass Wave Distortion", 
  "Roman Mosaic Floor", "Gas Cloud Simulation", "Noise Distortion Surface", "Sci-Fi Digital Core", 
  "Luxury Bokeh Lights", "Mind Map Surface", "Acoustic Wave Surface", "Crystal Flower Geometry", 
  "Light Spectrum Tunnel", "Information Flow Grid", "Light Tunnel Perspective", "Fluid Metallic Surface", 
  "Floating Ceiling Panels", "Bio Digital Fusion", "Elegant Light Curtains", "Honeycomb Cardboard", 
  "Luminous Ribbon Motion", "Cosmic Aurora Waves", "Interwoven Glass Layers", "Energy Storage Grid", 
  "Lotus Petal Arrangement", "Ceramic Wave Relief", "Hexagonal Relief", "Sci-Fi Electromagnetic Core", 
  "Infinity Hall", "Light Refraction Chamber", "Fintech Abstract Background", "Paint Splash Geometry", 
  "Stock Market Mesh", "Glass Hexagon Panels", "Technology Network", "Sand Dune Landscape", 
  "Glass Polygon Network", "Procedural Terrain", "Luxury Display Background", "Business Intelligence Pattern", 
  "Luxury Gold Fluid", "Crystal Mosaic Design", "Mirror Box Perspective", "Cinematic Light Rays", 
  "Flowing Crystal Curtains", "Presentation Motion Canvas", "Next Generation Abstract", "Mechanical Core Animation", 
  "Data Stream River", "Edge Glow Cubes", "Knowledge Graph Pattern", "Floating Silk Curtains", 
  "Frozen Bubble Surface", "Astral Energy Waves", "Electric Grid Pulse", "Natural Fiber Mesh", 
  "Autonomous Robot Paths", "Diamond Facet Surface", "Sci-Fi Energy Columns", "Industrial Harbor Lights", 
  "Factory Interior", "Geometric Horizon", "Presentation Background", "Power Grid Network", 
  "Bent Metal Sheets", "Sci-Fi Abstract Spaceship", "Stacked Polygon Towers", "Scientific Discovery Background", 
  "Marble Ribbon Motion", "Growing Crystal Network", "Neon Crystal Waves", "Microscope Lens View", 
  "Data Crystal Flow", "Creative Idea Burst", "Cosmic Energy Tunnel", "Bioluminescent Ocean", 
  "Cloud Layers", "Nordic Rune Background", "Glass Bubble Geometry", "God Rays Background", 
  "Oil Paint Marbling", "Explosion Debris Pattern", "Crystal Prism Refraction", "Boutique Interior Surface", 
  "Radiation Wave Pattern", "Mid-Century Modern Curves", "Infinity Polygon Tunnel", "Stress Line Visualization", 
  "Sci-Fi Cyber Tunnel", "Glow Ring Corridor", "Mist Volume Layers", "Depth Extrusion Illusion", 
  "Light Ball Network", "Ultra Minimal Geometry", "Future Metropolis Grid", "Sci-Fi Hangar Interior", 
  "Fabric Light Reflection", "Layered Wave Relief", "Neon Grid Horizon", "Snow Particle Field", 
  "Presentation Stage Design", "Planet Surface Grid", "Flowing Metallic Waves", "Container Stack Geometry", 
  "Gradient Polygon Surface", "Shattered Prism Layout", "Piano Key Geometry", "Dynamic Ring Array", 
  "Shadow Tunnel Effect", "Silver Mirror Mosaic", "Sci-Fi Portal Rings", "Sci-Fi Bio Lab", 
  "Ambient Fog Layers", "Glass Corridor Perspective", "Interactive Light Floor", "Infinity Ribbons", 
  "Airflow Contour Surface", "Creative Office Background", "Gallery Wall Surface", "Glowing Jelly Forms", 
  "Editorial Background Texture", "Floating Circular Discs", "Luxury Marble Texture", "Island Archipelago Pattern", 
  "Machine Learning Network", "Icosahedron Surface", "Sci-Fi Cryo Chamber", "Mirror Water Reflection", 
  "Moiré Optical Illusion", "Startup Workspace Design", "Abstract Lotus Pond", "Space Dock Geometry", 
  "Mercury Flow Surface", "Elegant Polygon Waves", "Chromatic Ripple Waves", "Sci-Fi Particle Matrix", 
  "Glossy Crystal Fabric", "Forest Mist Layers", "Linen Fold Structure", "Rose Gold", 
  "Modern Timber Grid", "Predictive Maintenance Surface", "Crystal Facet Landscape", "Flower Pollen Geometry", 
  "Processor Die Layout", "Glass Morphism Layers", "Ice Mist Geometry", "Sci-Fi Circuit Pathways", 
  "Future Technology Surface", "Color Interference Waves", "Glow Frame Corridor", "Glass Infinity Corridor", 
  "Triangular Prism Surface", "Sci-Fi Alien Planet", "Conference Background", "Sci-Fi Starfield", 
  "Frequency Ripple Pattern", "Latitude Longitude Mesh", "Sci-Fi Sonar Waves", "Algorithmic Particle Mesh", 
  "Sci-Fi Cosmic Nebula", "Bridge Cables", "Dynamic Fold Surface", "X-Ray Abstract Pattern", 
  "Ribbon Spiral Tunnel", "Communication Network", "Bio Organic Cells", "Data Pulse Rings", 
  "Liquid Glass Reflections", "Cube Matrix", "Ice Glass Surface", "Futuristic City", 
  "Connected City Geometry", "Geometric Light Waves", "Shadow Cube Matrix", "Chrono Wave Pattern", 
  "Avalanche Texture", "Pearlescent Fabric Flow", "Underwater Light Rays", "Liquid Droplet Matrix", 
  "Minimal Shadow Sculpture", "Sci-Fi Hex Grid", "Recursive Prism Array", "Ice Crystal Surface", 
  "Adaptive Grid Geometry", "Sci-Fi Energy Nexus", "Elegant Glitter Flow", "Topaz Facet Surface", 
  "Shadow Lattice Network", "Circle Array", "Light Ribbon Network", "Gradient Ribbon Tunnel", 
  "Luxury Celebration Background", "Parametric Spiral Surface", "Sci-Fi Infinity Cathedral", "Luxury Surface Design", 
  "Conceptual Motion Background", "Eco Innovation Surface", "Sci-Fi Data Streams", "Broadcast Ready Background", 
  "Cotton Soft Waves", "Greek Marble Architecture", "Spark Plasma Trails", "Ambient Light Architecture", 
  "Broadcast Motion Surface", "Neon Fabric Waves", "Concrete Surface", "Bokeh Circle Field", 
  "Iris Scan Pattern", "Glass Wave Canopy", "Spherical Triangle Mesh", "Exploded Mechanical Diagram", 
  "Battery Cells", "Chrome Ribbon Flow", "Tropical Foliage", "Chrome Layer Stack", 
  "Chrome Faceted Surface", "Depth Layer Network", "Forest Canopy Layers", "Sci-Fi Crystal Matrix", 
  "Liquid Glass Layers", "Long Shadow Corridor", "Liquid Satin Waves", "Prism Bloom Surface", 
  "Iridescent Surface", "Wave Roof", "Minimal Interface Layers", "Liquid Marble Texture", 
  "Floating Light Cubes", "Bubble Foam Surface", "Occult Geometry Pattern", "Nano Crystal Network", 
  "Spark Shower Effect", "Mirror Geometry Tunnel", "Meteor Shower Motion", "CRT Scanline Pattern", 
  "DNA Helix", "Floating Glass Platforms", "Recursive Triangle Grid", "Steel Framework", 
  "Mechanical Spring Pattern", "Plastic Fold Motion", "Smart Building Surface", "Fractal Cube Expansion", 
  "Snake Skin Geometry", "Hex Tile Expansion", "Factory Intelligence Grid", "Bamboo Geometry", 
  "Wireframe Terrain", "Neon Gradient Flow", "Health Technology Surface", "Basket Weave Geometry", 
  "Stem Cell Network", "Creative Studio Background", "Minimal Branding Surface", "Diamond Ring Geometry", 
  "Cogwheel Composition", "Stacked Acrylic Panels", "Perfume Luxury", "Big Data Flow", 
  "Galaxy Nebula Clouds", "Floating Monolith Array", "Architectural Light Wells", "Rock Layer Geometry", 
  "Topographic Lines", "Cosmic Energy", "Ribbon Flow", "Ice Fragment Surface", 
  "Fluid Surface Simulation", "Salt Flat Polygons", "Planetary Orbit Lines", "Industry Four Pattern", 
  "Floating Diamond Grid", "Sci-Fi Floating Cubes", "Interlaced Strip Pattern", "Telescope Mirror Layout", 
  "Creative Workspace Background", "Sci-Fi Reactor Core", "Telecommunication Tower Waves", "Digital Twin Mesh", 
  "Fractal Geometry", "Cloud Computing Layers", "Soft Cushion Geometry", "Glass Mosaic Motion", 
  "Web Dew Reflection", "Palm Leaf Shadows", "Minimal White Curves", "Advertising Background", 
  "Hexagon Network", "Ocean Caustics", "Sci-Fi Parametric Architecture", "Reflective Infinity Room", 
  "Physics Collision Waves", "Island Topography", "Sci-Fi Hyperspace Tunnel", "Golden Light Trails", 
  "Volumetric Crystal Light", "Alien Energy Core", "Infinite Corridor", "Opal Reflection Waves", 
  "Gallery Hall Geometry", "Infinite Polygon Carpet", "Immersive Energy Tunnel", "Illuminated Geometry", 
  "Neon Bubble Grid", "Comet Tail Flow", "Music Visualizer Mesh", "Deep Space Grid", 
  "Circular Economy Visualization", "Sci-Fi Universe Map", "Moroccan Tile Surface", "Hydrogen Technology", 
  "Light Energy Horizon", "Ambient Glow Geometry", "Economic Heatmap Surface", "Black Ink Diffusion", 
  "Forest Canopy Pattern", "Sci-Fi Cyber Grid", "Sci-Fi Crystal Corridor", "Solar Flare", 
  "Celestial Star Grid", "Golden Spark Particles", "Virtual Conference Stage", "Tensile Fabric", 
  "Pond5 Motion Design", "Hyperloop Tunnel", "Mandala Bloom", "Chromatic Glass Surface", 
  "Neon Energy Rings", "Sunshade Panel Design", "Liquid Surface Layers", "Luxury Product Platform", 
  "Urban Planning Grid", "Abstract Fluid Blob Network", "Minimal Line Art", "Sci-Fi Power Core", 
  "Fusion Plasma Chamber", "Sci-Fi Wormhole Entrance", "Gradient Mesh Bloom", "Embossed Leather Surface", 
  "Corporate Innovation Hub", "Pseudo 3D Layers", "Rain Droplet Ripples", "Edge Computing Network", 
  "Semiconductor Geometry", "Ancient Temple Geometry", "Code Matrix Surface", "Neon Energy Tunnel", 
  "Aurora Silk Curtains", "Premium Business Surface", "Dashboard Tile Pattern", "Color Gradient Fabric", 
  "Faceted Ice Landscape", "Volumetric Light Rays", "Low Poly Crystal Surface", "Sci-Fi Fusion Grid", 
  "Automation Dashboard", "Dot Matrix Motion", "Premium Abstract Environment", "CPU Core Surface", 
  "Layered Polygon Relief", "Glowing Core Orbs", "Vacuum Form Geometry", "Database Node Grid", 
  "Sci-Fi Antimatter Reactor", "Cairn Formation", "AI Intelligence Core", "Sci-Fi Holographic Interface", 
  "Catwalk Geometry", "Factory Conveyor Pattern", "Luxury Wall Cladding", "Remote Collaboration Waves", 
  "Glass Crystal Canopy", "Luxury Presentation Canvas", "Snow Crystal Lattice", "Decentralized Network Geometry", 
  "Digital Landscape Grid", "Multi Ribbon Surface", "Minimal Wave Layers", "Kinetic Ribbon Waves", 
  "Big Data Connections", "Dark Matter Waves", "Mirror Mosaic Surface", "Infrastructure Mesh", 
  "Geometric Sculpture", "Global Network", "Copper Oxidation Texture", "Hex Prism Landscape", 
  "Machine Core Assembly", "Ocean Caustic Mesh", "Molecular Structure", "Fractal Leaf Veins", 
  "Decorative Ceiling Pattern", "Coastal Line Geometry", "Color Bloom Explosion", "Creative Splash Motion", 
  "Fluid Gradient Waves", "Thin Film Interference", "Ice Crystal Web", "Low Poly Geometry", 
  "Pearl Surface Waves", "Fractal Flame Pattern", "Perspective Shadow Grid", "Marble Flow Motion", 
  "Cloud Ring Formation", "Steel Ribbon Motion", "Sci-Fi Galactic Network", "Server Rack Perspective", 
  "Ceramic Tiles", "Digital Collaboration Surface", "Terrain Elevation Mesh", "Cloud Infrastructure", 
  "Digital Noise Landscape", "Gradient Wave Mesh", "Premium Fabric Folds", "Holographic Bubble Field", 
  "Editorial Background", "Frozen Petal Surface", "Hexagonal Pavilion Mesh", "Sci-Fi Holographic Panels", 
  "Travertine Texture Pattern", "Furniture Panel Geometry", "Crystal Infinity Room", "River Delta Geometry", 
  "Satellite Orbit", "Terrazzo Pattern", "Impossible Cube Structure", "Synthetic Crystal Surface", 
  "Gradient Air Flow", "Floating Crystal Slabs", "Seamless Motion Canvas", "Sci-Fi Energy Core", 
  "Reactor Core Glow", "Product Showcase Stage", "Iridescent Bubble Tunnel", "Innovation Laboratory Surface", 
  "Cell Membrane Surface", "Sci-Fi Dyson Sphere", "Sci-Fi Infinite Corridor", "Quartz Vein Pattern", 
  "Urban Skyline", "Designer Luxury Surface", "Memphis Geometry", "Titanium Facet Pattern", 
  "Zen Sand Garden", "PCB Trace Layout", "Digital Globe Surface", "Sci-Fi Ion Storm", 
  "Glass Lamination Effect", "Sci-Fi Tron Tunnel", "Geometric Wave Surface", "Japanese Zen Waves", 
  "Financial Technology Waves", "Volcanic Energy Flow", "Mechanical Arm Network", "Sci-Fi Energy Chamber", 
  "Geometric Corridor", "Silk Ribbon Bloom", "Nanotechnology Grid", "Geode Interior", 
  "Deep Learning Flow", "Polished Pebble Layout", "Ruby Glow Pattern", "Liquid Glass Panels", 
  "Smart Contract Grid", "Alien Monolith Field", "Linen Textile Pattern", "Art Installation Grid", 
  "Terrazzo Surface Design", "Exoplanet Landscape", "Procedural Surface Flow", "Parametric Ribbon Surface", 
  "Signal Coverage Map", "Ribbon Glass Motion", "Sci-Fi Stellar Nursery", "Neural Brain Connections", 
  "Chinese Lattice Window", "Grid Distortion Waves", "Icicle Formation", "Rubber Sheet Geometry", 
  "Light Crystal Chamber", "Lunar Base Modules", "Hurricane Eye Geometry", "Professional Motion Background", 
  "Arabic Star Lattice", "Abstract Ceramic Relief", "Luxury Pedestal Scene", "Horizontal Blade Geometry", 
  "Deep Ocean Gradient", "Ink Diffusion Motion", "Sci-Fi Holographic Grid", "Perforated Metal Screen", 
  "Liquid Crystal Corridor", "Basalt Rock Pattern", "Chrome Helix Waves", "Frozen Glass Texture", 
  "Time Travel Rings", "Seaweed Flow Pattern", "Space Station Interior", "Mechanical Gear Matrix", 
  "Asteroid Belt Pattern", "Sci-Fi Tron Highway", "Sci-Fi Light Rings", "Storage Block Pattern", 
  "Sci-Fi Cyber City", "Glacial Wave Surface", "White Luxury Canvas", "Wave Crystal Geometry", 
  "Polygon Crystal Bloom", "Decorative Ceiling Waves", "Paper Fiber Texture", "Cloud Motion", 
  "Broken Crystal Pattern", "Dry Mud Geometry", "Soft Neon Halo", "Algorithm Flow Pattern", 
  "Cybernetic Skeleton", "Digital Pulse Grid", "Luxury Editorial Surface", "Luxury Gold Fabric", 
  "Silver Chrome Motion", "Recursive Circle Pattern", "Broadcast Background", "Dynamic Glass Fabric", 
  "Earth Layer Cross Section", "Sci-Fi Dark Matter", "Color Diffusion Waves", "Sci-Fi Space Station", 
  "Fusion Energy Sphere", "Circular Atrium Pattern", "Cable Network Geometry", "Luxury Upholstery Surface", 
  "Retro Digital Display", "Luxury Black Marble", "Energy Pulse Lattice", "Light Reflection Waves", 
  "Robotic Arm Geometry", "Corrugated Surface Design", "Showcase Platform", "Sci-Fi Plasma Grid", 
  "Ultra Minimal Background", "Cosmic Dust Field", "Infinite Light Hall", "Data Center Pathways", 
  "Sci-Fi Plasma Chamber", "Economic Network", "Premium Editorial Background", "Business Growth Surface", 
  "Lattice Structure", "Storm Cell Pattern", "Fluid Pearl Waves", "Liquid Glass Droplets", 
  "Digital Ocean Grid", "Quantum Signal Mesh", "Luxury Gold Ribbons", "Future Laboratory Design", 
  "Floating Ring Corridor", "Space Habitat Interior", "Oak Grain Geometry", "Wood Slat Rhythm", 
  "Foam Bubble Matrix", "Parametric Architecture", "Canopy Structure", "Molecular Network", 
  "Liquid Glass Canopy", "Sci-Fi Gravity Well", "Minimal White Cubes", "Sci-Fi Alien Crystals", 
  "AI Circuit Pattern", "Soft Fabric Layers", "Fractal Snow Geometry", "Tensile Membrane Forms", 
  "Premium Motion Canvas", "Sci-Fi Data Cubes", "Minimal Corridor", "Bauhaus Shapes", 
  "Black Mirror Geometry", "Internet Backbone Pattern", "Sci-Fi Volumetric Light", "Sci-Fi Digital Nexus", 
  "Soap Bubble Field", "Interlocking Polygon Tiles", "Museum Lighting", "Rocket Exhaust Trails", 
  "Dynamic Spiral Vortex", "Sci-Fi Satellite Network", "Minimal Curved Panels", "Helical Structure Design", 
  "Interactive Light Waves", "Success Arrow Abstraction", "Luxury Granite Finish", "Bio Digital Harmony", 
  "Minimal Arc Geometry", "Atomic Orbital Pattern", "Origami Flower Layers", "Molecular Bond Mesh", 
  "Granite Stone Geometry", "Fossil Spiral Geometry", "Podcast Studio Panels", "Aurora Light Curtains", 
  "Granular Particle Surface", "Rose Petal Layers", "Holographic Silk Waves", "Low Poly Mountains", 
  "Liquid Wave Corridor", "Glow Gradient Mesh", "Jewelry Showcase Lights", "Liquid Crystal Network", 
  "Pearlescent Fabric", "Zen Stone Landscape", "Elegant Fabric Motion", "City Light Matrix", 
  "Glass Bubble Tunnel", "Sci-Fi Floating Monoliths", "Digital Pulse Network", "Sci-Fi Lunar Colony", 
  "AI Neural Mesh", "Fabric Ripple Surface", "Modern Motion Background", "Sci-Fi Time Warp", 
  "Sci-Fi Dimensional Portal", "AI Neural Connections", "Celebration Confetti Flow", "Holographic Refraction", 
  "Asteroid Field", "Road Intersection Pattern", "Floating Transparent Rings", "Color Refraction Surface", 
  "Highway Light Trails", "Graphene Layer Surface", "Infinite Ribbon Matrix", "Digital Mosaic Flow", 
  "Backlit Wall Geometry", "Battery Cell Geometry", "Mercury Liquid Motion", "Holographic Fabric Motion", 
  "Broadcast Studio", "Slate Tile Pattern", "Snow Drift Waves", "Nebula Ribbon Motion", 
  "Circular Economy", "Sci-Fi Tron Rings", "Embossed Ornament Surface", "Fiber Optic Bundle", 
  "Sci-Fi Superconductor Grid", "Crystal Polygon Bloom", "Exploded Cube Grid", "Predictive Analytics Surface", 
  "Atmospheric Depth Layers", "Museum Interior Abstract", "Layered Panel Mosaic", "Iridescent Fabric", 
  "Data Cloud Visualization", "Fluid Geometry Motion", "Velvet Fabric", "Glass Cube Matrix", 
  "Solar Cell Matrix", "Frozen Polygon Mesh", "Luxury Event Stage", "Woven Ribbon Texture", 
  "Dynamic Surface Tessellation", "Volcanic Rock Relief", "Crystal Bubble Surface", "Stacked Paper Geometry", 
  "Fire Ember Particles", "Skylight Shadow Pattern", "GPU Circuit Pattern", "Streaming Overlay Background", 
  "Infographic Geometry", "Future Infrastructure", "Nebula Gas Clouds", "Pearlescent Bubble Texture", 
  "CAD Wireframe Design", "Exhibition Display", "Concentric Hexagon Tunnel", "Volumetric Gradient Tunnel", 
  "Embossed Paper Texture", "Pearlescent Fluid Motion", "Smart Infrastructure Pattern", "Asteroid Crystal Belt", 
  "Sci-Fi Alien Desert", "Dynamic Mesh Flow", "Investment Growth Surface", "Shadow Stair Illusion", 
  "Morphing Polygon Surface", "Bauhaus Composition", "Shell Structure Geometry", "Premium Luxury Background", 
  "Glowing Fiber Network", "Autonomous Vehicle Network", "Fashion Runway Lights", "Startup Theme", 
  "Holographic Bubble Tunnel", "Ribbon Infinity Loop", "Art Deco Geometry", "Geometric Fabric Waves", 
  "Butterfly Symmetry", "Lattice Shell Surface", "Floating Hex Tiles", "Sci-Fi Deep Space", 
  "Laboratory Molecules", "Jewelry Display", "Gift Wrap Geometry", "Gemstone Reflections", 
  "Ribbon Wave Corridor", "Inflatable Cushion Pattern", "Smoke Ribbon Tunnel", "Sci-Fi AI Core", 
  "Contour Landscape", "Sci-Fi Planet Rings", "Sci-Fi Laser Tunnel", "Sci-Fi Energy Cathedral", 
  "Minimal Premium Background", "Arcane Symbol Grid", "Polar Aurora Bands", "Liquid Ink Flow", 
  "Opal Stone Reflection", "Alien Desert Surface", "Blade Array Motion", "Victorian Ceiling Pattern", 
  "Mirror Reflection Tunnel", "Circular Wave Geometry", "Sci-Fi Energy Crystals", "Sci-Fi Cyber Corridor", 
  "Aurora Mist Layers", "Firework Particle Burst", "Volumetric Energy Field", "Computer Vision Grid", 
  "Information Flow Network", "Sci-Fi Data Highway", "Sci-Fi Drone Swarm", "Shipping Routes", 
  "Laser Grid Perspective", "Soft Crystal Glow", "Isometric Cubes", "Industrial Data Grid", 
  "Molecular Crystal Structure", "Galaxy Spiral Arms", "Architectural Slats", "Semantic Network Geometry", 
  "Firefly Swarm Motion", "Premium Packaging Pattern", "Fabric Curtain Motion", "Sci-Fi Energy Shield", 
  "Architectural Shadow Walls", "Business Presentation", "Brush Stroke Surface", "Dense Particle Swarm", 
  "News Studio Geometry", "Prism Light Corridor", "Mountain Ridge Layers", "Origami Polygon Animals", 
  "Crystal Reflection Grid", "Creative Abstract", "Automation Grid", "Token Economy Surface", 
  "Golden Crystal Surface", "Integrated Circuit Design", "Kevlar Weave Pattern", "Fiber Network Surface", 
  "Aurora Ribbon Motion", "Machine Core Geometry", "Linear Energy Surface", "Concert Laser Grid", 
  "Limestone Relief", "Pipeline Network", "Baroque Decorative Relief", "Blue Hour Glow", 
  "Sci-Fi Command Center", "Luxury Gold Geometry", "Root Network Geometry", "Camera Aperture Blades", 
  "Volumetric Glow Field", "Sonar Pulse Waves", "Voronoi Crystal Mesh", "Designer Paper Layers", 
  "Virtual Grid Tunnel", "Botanical Leaf Pattern", "Wood Grain Flow", "Backlit Geometry Pattern", 
  "Medical Technology", "Bridge Support Geometry", "Luxury Box Structure", "Swiss Design Geometry", 
  "Minimal White Fabric", "Premium Stage Design", "Hyperbolic Surface Design", "Floor Reflection Surface", 
  "Liquid Mirror Flow", "Museum Light Pattern", "Financial Background", "Mobility Flow Pattern", 
  "Servo Motor Geometry", "Modern Concrete Panels", "Bio Crystal Matrix", "Sci-Fi Galactic Core", 
  "Glass Blossom Pattern", "Research Network Geometry", "Electric Mobility", "Cross Section Geometry", 
  "Concentric Ripple Rings", "Fantasy Crystal Forest", "Sand Simulation Pattern", "Origami Crystal Forms", 
  "Stacked Panels", "Air Bubble Matrix", "Modern Facade Pattern", "Space Warp Corridor", 
  "Minimal Monument Forms", "Triangle Network", "Manufacturing Floor Grid", "Interwoven Fiber Network", 
  "Orbital Ring Station", "Industrial Surface", "Sci-Fi Alien Ruins", "Clustered Hexagons", 
  "Volumetric Crystal Glow", "Luminous Mist", "Recycled Material Pattern", "Solar Plasma Waves", 
  "Nano Fiber Pattern", "Brushed Aluminum Surface", "Cloth Simulation Geometry", "Geode Crystal Interior", 
  "Elastic Ring Waves", "Glass Ceiling", "Pearlescent Crystal Surface", "Genetic Helix Waves", 
  "Ribbon Energy Waves", "River Meander Pattern", "Digital Sand Waves", "Sci-Fi Industrial Core", 
  "Japanese Kumiko Pattern", "Fractal Lightning Network", "Geometric Crystal Relief", "Ribbon Orb Structure", 
  "Electron Cloud Geometry", "Sci-Fi Server Core", "Polygon Petal Structure", "Glass Surface Waves", 
  "Warehouse Geometry", "Sci-Fi Cosmic Temple", "Neural Energy Web", "Glass Reflection Waves", 
  "Multi Layer Waves", "Minimal Light Surface", "Pearlescent Reflection Grid", "Logistics Grid Network", 
  "Folded Plate Structure", "Sci-Fi Mechanical Core", "Floral Mandala Bloom", "Rain Curtains", 
  "Volumetric Fog Rays", "Art Deco Pattern", "Persian Geometry", "Thread Weave Geometry", 
  "Aurora Flow Geometry", "Geometric Bloom", "Wind Stream Lines", "Virtual Event Background", 
  "Digital Rain Matrix", "Black Gold Background", "Layered Shadow Blocks", "Satellite Terrain View", 
  "Data Pipeline Surface", "Cyclone Spiral View", "Abstract Smoke Flow", "Metallic Fabric Motion", 
  "Cosmic Dust", "Air Route Network", "Sci-Fi Quantum Cathedral", "Infinite Triangle Network", 
  "Alchemy Circle Design", "Water Ripple", "5G Signal Mesh", "Sci-Fi Light Corridor", 
  "Hexagon Energy Surface", "Long Shadow Geometry", "Pixel Dissolve Waves", "Fluid Reflective Surface", 
  "Fiberglass Texture Motion", "Wave Fabric Motion", "Low Poly Mountain Range", "Soft Shadow Geometry", 
  "Corporate Glass Hall", "Sci-Fi Infinite Triangles", "Cube Sphere Network", "Folded Polygon Flowers", 
  "Particle Burst Geometry", "Pixelated Gradient Blocks", "Laser Beam Tunnel", "Ice Cave Crystals", 
  "Sci-Fi Aurora Planet", "Glossy Plastic Surface", "Luxury Dark Satin", "Temple Roof Pattern", 
  "Sci-Fi Binary Rain", "Glowing Crystal Forest", "Infinite Crystal Hall", "Terrazzo Surface", 
  "Wind Turbine Abstract", "Online Conference Motion", "Energy Halo", "Compass Rose", 
  "Atmospheric Gradient Dome", "Image Recognition Surface", "Lantern Glow Pattern", "Business Lobby Surface", 
  "Lagoon Reflection Surface", "Infinite Circle Tunnel", "Liquid Glass Morphing", "Broadcast Studio Waves", 
  "Podcast Background", "Futuristic Portal Rings", "Infinity Grid Perspective", "Mechanical Blueprint Surface", 
  "Cloud Cell Structure", "Backlit Geometry", "Ambient Light Fabric", "Porcelain Surface", 
  "Faceted Glass Landscape", "Innovation Background", "Designer Surface Flow", "Coral Polyps Pattern", 
  "Minimal Polygon Motion", "Bronze Relief Texture", "Geodesic Dome", "Dynamic Stripe Waves", 
  "Innovation Burst Geometry", "Memphis Abstract Shapes", "Sci-Fi Robotic Arms", "Wire Mesh Surface", 
  "Lotus Geometry", "Lunar Horizon Landscape", "Luxury Motion Design", "Copper Wire Mesh", 
  "Sci-Fi Tron Corridor", "Isometric Architecture", "Glass Fold Geometry", "Computational Geometry", 
  "Ribbon Tunnel", "Technology Roadmap Surface", "Satin Reflection Grid", "Deep Sea Particle Drift", 
  "Origami Pavilion", "Floating Dust Particles", "Autonomous Traffic Surface", "Silver Light Waves", 
  "LED Ring Ceiling", "Zen Rock Stack", "AI Processor Core", "Motion Gradient Fabric", 
  "Mesh Fabric Texture", "Meteor Trail Network", "Microstock Premium Background", "Shell Layer Relief", 
  "Quartz Mosaic Surface", "Interwoven Hex Mesh", "Fantasy Energy Flow", "Construction Framework", 
  "Porcelain Surface Waves", "Enzyme Structure Abstract", "Grid Energy Waves", "Synapse Connection Flow", 
  "Soft Polymer Geometry", "Shipping Route Pattern", "Floating Crystal Bridges", "Fusion Reactor Core", 
  "Facade Shadow Geometry", "Glass Curtain Layers", "Ink Cloud Explosion", "Urban Window Grid", 
  "Angular Glass Panels", "Holographic Film Pattern", "Prism Energy Corridor", "Network Hub Geometry", 
  "Twisting Branch Network", "Sci-Fi Solar Flare", "Layered Crystal Geometry", "Stacked Marble Plates", 
  "Ethereal Glow Clouds", "Liquid Bubble Field", "Butterfly Wing Pattern", "Glass Cube Tunnel", 
  "Holographic Grid Film", "Architectural Geometry Flow", "Iridescent Crystal Fabric", "Flame Ribbon Motion", 
  "Digital Horizon", "Stone Texture Motion", "Electronic Component Grid", "Photon Energy Tunnel", 
  "Byzantine Gold Pattern", "Leather Texture", "Alcohol Ink Motion", "Professional Broadcast Backdrop", 
  "Luxury Showroom Interior", "Galaxy Particles", "Aurora Borealis", "Polygon Bloom", 
  "Dawn Light Layers", "Experimental Abstract Pattern", "Nautilus Spiral Geometry", "Cube Stack Illusion", 
  "Quantum Crystal Core", "Festival Light Beams", "Folded Polygon Birds", "Edge Light Frames", 
  "Diamond Grid", "Infinite Circle Matrix", "Precision Dial Pattern", "Presentation Loop Background", 
  "Retail Showcase", "Modern Visual Canvas", "Luxury Textile Flow", "Sci-Fi Neon Grid", 
  "Fractal Tree Branches", "Energy Lightning Mesh", "Skybridge Perspective", "Kinetic Sculpture", 
  "Polygon Landscape", "Compression Artifact Style", "Minimal White Layers", "Cellular Roof Pattern", 
  "Organic Crystal Surface", "Neon Ribbon Spiral", "Modern Wall Panels", "Multi Faceted Surface", 
  "Visualization Background", "Soft Airbrush Texture", "Soft Glow Waves", "Etched Glass Pattern", 
  "Elegant Geometric Surface", "Shutterstock Trending", "Mandala Bloom Pattern", "Sunlight Projection", 
  "Digital Topography", "Arctic Aurora Field", "Layered Ribbon Flow", "Lunar Surface Texture", 
  "Modern Pavilion", "Zen Circle Ripples", "Sci-Fi Energy Pulse", "Light Corridor", 
  "Polygon Cloud Layers", "Gradient Horizon", "Curtain Fold Waves", "Digital Ecosystem Surface", 
  "Creativity Flow Pattern", "Cellular Foam Geometry", "Alien Organic Surface", "Glass Ceiling Grid", 
  "Interior Wall Relief", "Spectrum Crystal Flow", "Emerald Crystal", "Coral Reef Pattern", 
  "Infinity Ribbon", "Luxury Crystal Hall", "Glowing Hex Grid", "Sci-Fi Space Gate", 
  "Beam Splitter Light", "Digital Fingerprint Waves", "Luxury Mirror Marble", "Luxury Dark Crystal", 
  "Digital Banking Surface", "Basalt Hex Columns", "Amethyst Cluster Design", "Glow Bubble Network", 
  "Digital Canvas Pattern", "Neural Energy Surface", "Luminous Panel Array", "Vintage Map Texture", 
  "Sapphire Crystal Grid", "Elegant Background Loop", "Expanding Ripple Field", "Electric Mobility Surface", 
  "Tropical Palm Geometry", "Luxury Wall Panels", "Cosmetic Display Surface", "Eco Technology", 
  "Glass Shard Explosion", "Infinity Light Grid", "Digital Consciousness", "Banana Leaf Pattern", 
  "Elastic Polygon Mesh", "Chrome Liquid Streams", "Gradient Ribbon Network", "Virtual Grid Waves", 
  "Moon Crater Pattern", "Planetary Dome City", "Sci-Fi Corridor Depth", "Water Flow Streamlines", 
  "Stretch Fabric Waves", "Infinite Grid Perspective", "Rice Paper Texture", "Polarized Light Texture", 
  "Architectural Atrium", "Rolling Hill Geometry", "Minimal Interior Shadows", "Air Current Visualization", 
  "Sci-Fi Signal Transmission", "Sacred Geometric Mandala Lattice", "Glass Marble Pattern", 
  "Sci-Fi Particle Accelerator", "Retina Geometry", "Metal Crystal Surface", "Voronoi Cell Network", 
  "Air Pocket Surface", "Liquid Marble Surface", "Sci-Fi Android Assembly", "Flexible Membrane Motion", 
  "Accordion Fold Structure", "Concept Presentation Background", "Motion Array Style Background", 
  "Medical Scan Layers", "Future Energy Surface", "Chronograph Layout", "Cosmic Dust Storm", 
  "Executive Presentation", "Fiber Optic Light", "Chrome Bubble Cluster", "Sapphire Crystal Surface", 
  "Cloudscape Timelapse Style", "Cathedral Vault Geometry", "Curved Metal Surface", "Hyperspace Tunnel", 
  "Floating Window Panels", "Optical Lens Pattern", "Metaverse Architecture", "Business Wave Design", 
  "Holographic Energy Waves", "Infinite Diamond Grid", "Transparent Bubble Field", "Fusion Energy Core", 
  "Sci-Fi Planetary Rings", "Analog Scan Texture", "Cascade Polygon Waves", "Luxury Black Glass", 
  "Gradient Depth Layers", "Natural Stone Relief", "Gradient Halo Surface", "Luxury Metallic Flow", 
  "Digital Aurora", "Geodesic Dome Network", "Business Hero Background", "Sci-Fi Gravity Waves", 
  "Boardroom Abstract", "Crystal Ice Formation", "Shell Spiral Geometry", "Geodesic Sphere Motion", 
  "Mesh Ribbon Waves", "Animated Mosaic Surface", "Soft Bubble Motion", "Volumetric Atmosphere", 
  "Warehouse Grid", "Stained Glass Geometry", "Stone Balance Composition", "Golden Spiral Motion", 
  "Transparent Water Surface", "Dynamic Line Mesh", "Parametric Roof Structure", "Modern Architectural Canvas", 
  "Electric Particle Storm", "Concrete Relief Surface", "Premium Confetti Flow", "Floating Platforms", 
  "Fiber Glass Layers", "Slate Stone Geometry", "Gemstone Pattern", "Marble Block Composition", 
  "Sci-Fi Engine Room", "Energy Surface Flow", "Ribbon Helix Structure", "Graphene Surface", 
  "Protein Fold Geometry", "Delaunay Triangle Mesh", "Glossy Fold Surface", "Volumetric Cloud Flow", 
  "Root Fractal System", "Fantasy Crystal Garden", "Abstract Cyber Waves", "Metal Sphere Grid", 
  "Silicon Wafer Texture", "Flight Path Visualization", "Ink Flow Surface", "Respiratory Waveform", 
  "Floating Monoliths", "Gemstone Mosaic", "Sci-Fi Data Core", "Mountain Topography", 
  "Golden Hour Rays", "Japanese Wave Pattern", "Fashion Runway", "Holographic Mirror Panels", 
  "Digital Fog Layers", "Linear Gradient Motion", "Floating Frame System", "Bee Hive Interior", 
  "Fabric Canopy Motion", "Aurora Mist Horizon", "Light Bloom Corridor", "Titanium Surface", 
  "Light Curtain Surface", "Liquid Gradient Surface", "Glass Layer Sculpture", "Premium Motion Background", 
  "Quantum Particle Clouds", "Titanium Panel Design", "Procedural Noise Surface", "Debossed Surface Design", 
  "Bubble Membrane", "Sci-Fi Electromagnetic Waves", "Ring Portal Animation", "Creative Premium Canvas", 
  "Polygon Bloom Surface", "Mystic Energy Circles", "Botanical Leaves", "Industrial Schematic Lines", 
  "Luxury Gold Waves", "Paper Cut Layered Landscape", "Ambient Light Curtains", "Authentication Pattern", 
  "Ash Cloud Layers", "Reflective Crystal Surface", "Glowing Liquid Flow", "Glow Fabric Motion", 
  "Sunbeam Volume", "Office Tower Reflection", "Mixed Reality Surface", "Abstract Energy Waves", 
  "Organic Voronoi Cells", "Weather Front Pattern", "Fractal Line Growth", "Future Data Surface", 
  "Rain Curtain Surface", "Sci-Fi Magnetic Field", "Glitch Pixel Blocks", "Holographic Ring Corridor", 
  "Depth Gradient Mesh", "Colorful Ribbon Dance", "Contour Map Animation", "Ancient Stone Pattern", 
  "Premium Polygon Canvas", "Film Grain Abstract", "Bamboo Forest Perspective", "Sci-Fi Reality Fracture", 
  "Glass Facet Surface", "Sci-Fi Autonomous Systems", "Sci-Fi Prism Corridor", "Carbon Sheet Waves", 
  "Particle Bloom Motion", "Paper Relief Waves", "Abstract Portal", "Natural Rock Mosaic", 
  "Temporal Distortion Grid", "Sci-Fi Quantum Core", "Cyber Security Grid", "Wind Stream Visualization", 
  "Luminous Polygon Tunnel", "Prismatic Polygon Field", "Planet Ring Geometry", "Floating Rings", 
  "Particle Simulation Surface", "Luxury Floor Tiles", "Coral Bloom Animation", "Crystal Rain Pattern", 
  "Designer Background Collection", "Iridescent Waves", "Rope Network Pattern", "Neon Flow Tunnel", 
  "Sci-Fi Docking Bay", "Sea Current Mesh", "Sci-Fi Crystal Reactor", "Window Reflection Grid", 
  "Architectural Blueprint Motion", "Egyptian Golden Pattern", "Drone Swarm Formation", "Designer Showcase Background", 
  "Cloud Vortex Motion", "Luxury Satin Waves", "Sci-Fi Robotics Factory", "Minimal Cubic Landscape", 
  "Executive Office Interior", "Stacked Foam Blocks", "Marble Flow Surface", "Crystal Surface Relief", 
  "Modern Gradient Surface", "Creative Market Abstract", "Electrostatic Field", "Metal Net Structure", 
  "Pixel Matrix Display", "Premium Executive Surface", "Sci-Fi Engine Exhaust", "Crystal Refraction Flow", 
  "Sci-Fi Space Cathedral", "Cork Texture Layout", "Moss Texture Surface", "Sci-Fi Asteroid Field", 
  "Sci-Fi Warp Speed", "Meteor Shower", "Fractal Polygon Surface", "Product Reveal Stage", 
  "Gradient Silk Canopy", "Quantum Chip Pattern", "Shadow Frame/Layers"
];

const USER_STYLES = [
  "Abstract", "Minimal", "Luxury", "Modern", "Contemporary", "Futuristic", "Sci-Fi", "Cyberpunk", 
  "Synthwave", "Retrowave", "Y2K", "Glassmorphism", "Neumorphism", "Claymorphism", "Aurora", 
  "Holographic", "Iridescent", "Pearlescent", "Chromatic", "Monochromatic", "Duotone", "Gradient Mesh", 
  "Gradient Blur", "Soft Gradient", "Mesh Gradient", "Fluid", "Liquid", "Organic", "Biomorphic", 
  "Morphing", "Ribbon", "Silk", "Satin", "Fabric", "Drapery", "Folded", "Pleated", "Elastic", 
  "Gel", "Blob", "Inflatable", "Bubble", "Foam", "Membrane", "Viscous", "Molten", "Crystalline", 
  "Faceted", "Prismatic", "Reflective", "Refractive", "Transparent", "Translucent", "Glossy", 
  "Matte", "Metallic", "Chrome", "Mirror", "Frosted", "Polished", "Brushed", "Anodized", 
  "Brutalist", "Industrial", "Architectural", "Parametric", "Generative", "Computational", 
  "Algorithmic", "Procedural", "Geometric", "Isometric", "Axonometric", "Pseudo 3D", "Low Poly", 
  "Voxel", "Wireframe", "Topographic", "Contour", "Hexagonal", "Polygonal", "Triangulated", 
  "Voronoi", "Tessellated", "Fractal", "Sacred Geometry", "Mandala", "Radial", "Circular", 
  "Linear", "Curvilinear", "Layered", "Stacked", "Extruded", "Carved", "Embossed", "Debossed", 
  "Paper Cut", "Origami", "Kirigami", "Collage", "Mosaic", "Patchwork", "Woven", "Knitted", 
  "Braided", "Lattice", "Mesh", "Grid", "Matrix", "Network", "Node Based", "Particle", 
  "Volumetric", "Atmospheric", "Ethereal", "Dreamlike", "Surreal", "Fantasy", "Mystical", 
  "Celestial", "Cosmic", "Galactic", "Nebula", "Astronomical", "Quantum", "Digital", "Virtual", 
  "Cyber", "AI Inspired", "Data Driven", "Tech", "HUD Inspired", "Interface", "Infographic", 
  "Blueprint", "Blueprint Wireframe", "Scientific", "Medical", "Molecular", "DNA Inspired", 
  "Neural", "Energy", "Plasma", "Electric", "Magnetic", "Photon", "Laser", "Light Based", 
  "Glow", "Neon", "Luminous", "Radiant", "Backlit", "Silhouette", "Shadow Play", "Long Shadow", 
  "Ambient", "Soft Light", "High Contrast", "Dark Mode", "Light Mode", "High Key", "Low Key", 
  "Pastel", "Muted", "Vibrant", "Bold", "Colorful", "Luxury Editorial", "Corporate", "Business", 
  "Premium", "Elegant", "Clean", "Simple", "Playful", "Cute", "Flat Design", "Semi Flat", 
  "Lottie Style", "Iconic", "Vector", "Editorial", "Presentation", "Broadcast", "Cinematic", 
  "Immersive", "Dynamic", "Kinetic", "Experimental", "Artistic", "Conceptual", "Decorative", 
  "Ornamental", "Botanical", "Natural", "Eco", "Zen", "Japanese", "Scandinavian", "Nordic", 
  "Bauhaus", "Swiss Design", "Memphis", "Art Deco", "Minimalist", "Maximalist", "Retro", 
  "Vintage", "Classic", "Timeless", "Evergreen", "Organic Modern", "Soft Modern", "Luxury Minimal", 
  "Future Luxury", "High Tech", "Ultra Modern", "Hyperreal", "Hyper Minimal", "Ultra Clean", 
  "Premium Motion", "Motion Graphics", "Loop Friendly", "Seamless", "Infinite", "Infinity", 
  "Floating", "Weightless", "Levitation", "Adaptive", "Responsive", "Harmonic", "Balanced", 
  "Symmetrical", "Asymmetrical", "Chaotic", "Controlled Chaos", "Precision", "Technical", 
  "Mechanical", "Robotic", "Nano", "Micro", "Macro", "Microscopic", "Macroscopic", "Photonic", 
  "Spectral", "Caustic", "Liquid Crystal", "Bio Digital", "Nature Tech", "Fusion", "Hybrid"
];

const USER_MATERIALS = [
  "Glass", "Frosted Glass", "Clear Glass", "Tinted Glass", "Smoked Glass", "Crystal Glass", 
  "Prism Glass", "Stained Glass", "Acrylic", "Transparent Acrylic", "Frosted Acrylic", 
  "Polycarbonate", "Plastic", "Glossy Plastic", "Matte Plastic", "Soft Plastic", "Liquid Plastic", 
  "PVC", "Resin", "Epoxy Resin", "Liquid Resin", "Gel", "Jelly", "Silicone", "Rubber", "Latex", 
  "Foam", "Memory Foam", "Soap Foam", "Bubble Foam", "Fabric", "Silk", "Satin", "Velvet", 
  "Linen", "Cotton", "Canvas", "Denim", "Leather", "Suede", "Felt", "Wool", "Cashmere", 
  "Chiffon", "Organza", "Tulle", "Mesh Fabric", "Knitted Fabric", "Woven Fabric", "Carbon Fiber", 
  "Kevlar", "Graphene", "Graphite", "Paper", "Cardboard", "Craft Paper", "Rice Paper", 
  "Parchment", "Origami Paper", "Foil Paper", "Metal", "Steel", "Stainless Steel", "Brushed Steel", 
  "Polished Steel", "Iron", "Cast Iron", "Aluminum", "Brushed Aluminum", "Titanium", 
  "Titanium Alloy", "Carbon Steel", "Copper", "Brass", "Bronze", "Nickel", "Zinc", "Chromium", 
  "Chrome", "Liquid Chrome", "Mercury", "Gold", "Rose Gold", "White Gold", "Silver", "Platinum", 
  "Palladium", "Pearl", "Mother of Pearl", "Opal", "Diamond", "Quartz", "Crystal", "Rock Crystal", 
  "Amethyst", "Emerald", "Ruby", "Sapphire", "Topaz", "Aquamarine", "Citrine", "Jade", "Obsidian", 
  "Onyx", "Agate", "Geode", "Marble", "Granite", "Slate", "Basalt", "Limestone", "Sandstone", 
  "Travertine", "Terrazzo", "Concrete", "Cement", "Plaster", "Stucco", "Clay", "Ceramic", 
  "Porcelain", "Stone", "Pebble", "Gravel", "Rock", "Ice", "Frost", "Snow", "Water", "Ocean Water", 
  "River Water", "Liquid", "Liquid Metal", "Molten Metal", "Lava", "Magma", "Smoke", "Fog", 
  "Mist", "Steam", "Cloud", "Dust", "Ash", "Sand", "Salt", "Salt Crystal", "Sugar Crystal", 
  "Honey", "Wax", "Paraffin Wax", "Oil", "Ink", "Alcohol Ink", "Paint", "Watercolor", 
  "Acrylic Paint", "Oil Paint", "Pigment", "Powder", "Glitter", "Confetti", "Sequins", 
  "Fiber Optic", "Optical Fiber", "LED", "Neon Tube", "Light Beam", "Laser", "Photon", 
  "Plasma", "Energy", "Electric Arc", "Lightning", "Holographic Film", "Dichroic Film", 
  "Iridescent Film", "Pearlescent Coating", "Metallic Paint", "Anodized Metal", "Mirror", 
  "Reflective Mirror", "One Way Mirror", "Liquid Mirror", "Ceramic Tile", "Mosaic Tile", 
  "Glass Tile", "Wood", "Oak", "Walnut", "Maple", "Birch", "Pine", "Bamboo", "Cork", "Rattan", 
  "Vine", "Leaf", "Palm Leaf", "Monstera Leaf", "Flower Petal", "Rose Petal", "Lotus Petal", 
  "Feather", "Shell", "Coral", "Bone", "Ivory", "DNA Strand", "Cell Membrane", "Neuron Fiber", 
  "Molecular Structure", "Nanotube", "Microchip", "Silicon Wafer", "Circuit Board", "PCB", 
  "Semiconductor", "Liquid Crystal", "OLED", "LCD", "Ink Display", "Pixel Matrix", "Voxel Block", 
  "Digital Mesh", "Wireframe", "Particle", "Point Cloud", "Voxel Cloud", "Polygon Surface", 
  "Hexagonal Mesh", "Voronoi Cells", "Parametric Surface", "Topographic Surface", "Gradient Mesh", 
  "Volumetric Fog", "Caustic Light", "Aurora Light", "Nebula Gas", "Cosmic Dust", "Star Field", 
  "Dark Matter", "Crystal Dust", "Diamond Dust", "Golden Dust", "Silver Dust", "Energy Field", 
  "Magnetic Field", "Force Field", "Quantum Field", "Photon Field"
];

const USER_MOTIONS = [
  "Static", "Still", "Idle", "Smooth", "Fluid", "Flowing", "Organic Flow", "Liquid Motion", 
  "Silky Motion", "Gentle Drift", "Slow Drift", "Fast Drift", "Floating", "Levitation", "Hovering", 
  "Suspended", "Weightless", "Gliding", "Sliding", "Rolling", "Spinning", "Rotating", "Orbiting", 
  "Revolving", "Circling", "Swirling", "Whirling", "Twisting", "Curling", "Coiling", "Uncoiling", 
  "Looping", "Endless Loop", "Infinite Loop", "Oscillating", "Swinging", "Swaying", "Rocking", 
  "Wobbling", "Shimmering", "Shaking", "Vibrating", "Trembling", "Pulsing", "Heartbeat Pulse", 
  "Breathing", "Expanding", "Contracting", "Inflating", "Deflating", "Growing", "Shrinking", 
  "Stretching", "Compressing", "Morphing", "Transforming", "Blending", "Merging", "Splitting", 
  "Separating", "Dispersing", "Gathering", "Converging", "Diverging", "Scattering", "Assembling", 
  "Disassembling", "Connecting", "Disconnecting", "Interweaving", "Unfolding", "Folding", 
  "Blooming", "Unfurling", "Wrapping", "Unwrapping", "Cascading", "Waterfall Motion", "Pouring", 
  "Streaming", "Trickling", "Rippling", "Undulating", "Waving", "Surging", "Rolling Waves", 
  "Splashing", "Dropping", "Falling", "Rising", "Ascending", "Descending", "Launching", "Landing", 
  "Bouncing", "Rebounding", "Elastic Bounce", "Spring Motion", "Snapping", "Popping", "Bursting", 
  "Exploding", "Imploding", "Collapsing", "Cracking", "Shattering", "Fragmenting", "Dissolving", 
  "Melting", "Freezing", "Solidifying", "Evaporating", "Condensing", "Diffusing", "Radiating", 
  "Emitting", "Glowing", "Flickering", "Blinking", "Flashing", "Sparkling", "Twinkling", 
  "Glittering", "Shining", "Reflecting", "Refracting", "Scintillating", "Panning Flow", "Sweeping", 
  "Scanning", "Tracing", "Drawing", "Painting", "Writing Motion", "Typing Motion", "Loading Motion", 
  "Progressive Reveal", "Circular Reveal", "Linear Reveal", "Radial Reveal", "Wave Reveal", 
  "Mask Reveal", "Ripple Reveal", "Fade In", "Fade Out", "Cross Dissolve", "Crossfade", 
  "Appearing", "Disappearing", "Emerging", "Submerging", "Surfacing", "Sinking", "Zooming", 
  "Push Motion", "Pull Motion", "Stretch Reveal", "Peeling", "Flipping", "Tilting", "Pivoting", 
  "Skewing", "Shearing", "Warping", "Distorting", "Bending", "Flexing", "Breathing Surface", 
  "Living Motion", "Organic Growth", "Cell Division", "Neural Firing", "Energy Flow", "Power Surge", 
  "Electric Pulse", "Magnetic Attraction", "Magnetic Repulsion", "Particle Drift", "Particle Attraction", 
  "Particle Explosion", "Particle Swarm", "Particle Orbit", "Particle Stream", "Particle Rain", 
  "Particle Rise", "Dust Drift", "Smoke Rise", "Fog Drift", "Mist Flow", "Cloud Formation", 
  "Cloud Dissipation", "Fire Flicker", "Flame Dance", "Lava Flow", "Water Flow", "Ink Diffusion", 
  "Paint Spread", "Bubble Rise", "Bubble Pop", "Foam Expansion", "Gel Wobble", "Jelly Bounce", 
  "Fabric Flutter", "Fabric Ripple", "Curtain Sway", "Ribbon Dance", "Ribbon Twist", "Ribbon Flow", 
  "Silk Flow", "Hair Flow", "Grass Sway", "Leaf Flutter", "Petal Fall", "Snow Fall", "Rain Fall", 
  "Meteor Shower", "Comet Trail", "Star Twinkle", "Nebula Expansion", "Galaxy Rotation", 
  "Planet Orbit", "Solar Flare", "Aurora Flow", "Lightning Strike", "Energy Burst", "Portal Opening", 
  "Portal Closing", "Warp Transition", "Time Distortion", "Space Distortion", "Gravity Pull", 
  "Gravity Wave", "Black Hole Suction", "Vortex Spin", "Tornado Spiral", "Cyclone Rotation", 
  "Helical Motion", "Spiral Motion", "Figure Eight Motion", "Pendulum Motion", "Infinity Motion", 
  "Random Motion", "Chaotic Motion", "Controlled Motion", "Synchronized Motion", "Sequential Motion", 
  "Alternating Motion", "Rhythmic Motion", "Continuous Motion", "Intermittent Motion", "Reactive Motion", 
  "Adaptive Motion", "Responsive Motion", "Harmonic Motion", "Procedural Motion", "Generative Motion", 
  "Algorithmic Motion"
];

const USER_LIGHTINGS = [
  "Ambient Light", "Ambient Glow", "Ambient Illumination", "Soft Light", "Soft Lighting", 
  "Soft Glow", "Soft Highlights", "Hard Light", "Hard Lighting", "Diffuse Light", "Diffused Lighting", 
  "Direct Light", "Indirect Light", "Natural Light", "Artificial Light", "Studio Lighting", 
  "HDR Lighting", "Global Illumination", "Even Lighting", "High Key Lighting", "Low Key Lighting", 
  "Balanced Lighting", "Volumetric Light", "Volumetric Glow", "God Rays", "Light Shafts", 
  "Light Beams", "Light Streaks", "Light Bloom", "Bloom Lighting", "Glow Lighting", "Luminous Lighting", 
  "Radiant Light", "Backlight", "Backlighting", "Front Light", "Front Lighting", "Side Light", 
  "Side Lighting", "Top Light", "Top Lighting", "Bottom Light", "Bottom Lighting", "Rim Light", 
  "Rim Lighting", "Edge Light", "Edge Lighting", "Edge Glow", "Contour Lighting", "Accent Lighting", 
  "Fill Light", "Key Light", "Three Point Lighting", "Split Lighting", "Cross Lighting", 
  "Cross Polarized Light", "Spotlight", "Soft Spotlight", "Focused Spotlight", "Directional Light", 
  "Parallel Light", "Point Light", "Area Light", "Rectangular Light", "Circular Light", "Disk Light", 
  "Tube Light", "Strip Light", "Panel Light", "Ring Light", "Dome Light", "Sphere Light", 
  "Hemisphere Light", "Environment Light", "Sky Light", "Sunlight", "Moonlight", "Golden Hour Light", 
  "Blue Hour Light", "Twilight Glow", "Sunset Glow", "Sunrise Glow", "Daylight", "Overcast Light", 
  "Cloud Filtered Light", "Aurora Light", "Neon Glow", "LED Glow", "Laser Light", "Photon Glow", 
  "Plasma Glow", "Energy Glow", "Electric Glow", "Cyber Glow", "Holographic Light", "Prismatic Light", 
  "Spectral Light", "Rainbow Refraction", "Caustic Light", "Water Caustics", "Crystal Refraction", 
  "Glass Refraction", "Reflected Light", "Mirror Reflection", "Specular Highlights", "Gloss Highlights", 
  "Wet Highlights", "Metallic Highlights", "Pearlescent Glow", "Iridescent Reflection", 
  "Holographic Reflection", "Diffraction Light", "Chromatic Glow", "Gradient Lighting", 
  "Color Wash Lighting", "Monochrome Lighting", "Duotone Lighting", "Tri Color Lighting", "Warm Lighting", 
  "Cool Lighting", "Neutral Lighting", "White Lighting", "Golden Lighting", "Amber Lighting", 
  "Orange Glow", "Red Glow", "Pink Glow", "Purple Glow", "Blue Glow", "Cyan Glow", "Teal Glow", 
  "Green Glow", "Emerald Glow", "Mint Glow", "Turquoise Glow", "Violet Glow", "Magenta Glow", 
  "Ultraviolet Glow", "Pastel Lighting", "Muted Lighting", "Vibrant Lighting", "High Contrast Lighting", 
  "Low Contrast Lighting", "Dramatic Lighting", "Moody Lighting", "Cinematic Lighting", "Luxury Lighting", 
  "Elegant Lighting", "Minimal Lighting", "Corporate Lighting", "Editorial Lighting", "Broadcast Lighting", 
  "Presentation Lighting", "Sci-Fi Lighting", "Futuristic Lighting", "Cyberpunk Lighting", 
  "Synthwave Lighting", "Retrowave Lighting", "Dreamy Lighting", "Fantasy Lighting", "Mystical Glow", 
  "Celestial Light", "Cosmic Glow", "Galaxy Illumination", "Nebula Glow", "Starlight", "Planetary Glow", 
  "Solar Flare Lighting", "Lunar Glow", "Atmospheric Lighting", "Fog Lighting", "Mist Lighting", 
  "Smoke Lighting", "Dust Light Rays", "Particle Illumination", "Floating Light Particles", 
  "Spark Lighting", "Fire Glow", "Ember Glow", "Lava Glow", "Molten Glow", "Ice Glow", "Crystal Glow", 
  "Diamond Sparkle", "Gemstone Glow", "Energy Core Glow", "Reactor Glow", "Portal Glow", 
  "Quantum Glow", "Digital Glow", "Data Glow", "Neural Glow", "AI Glow", "Tech Lighting", 
  "Interface Glow", "HUD Glow", "Grid Glow", "Matrix Glow", "Wireframe Glow", "Outline Glow", 
  "Inner Glow", "Outer Glow", "Halo Glow", "Corona Glow", "Aura Lighting", "Pulse Glow", 
  "Breathing Glow", "Shimmer Lighting", "Scintillation", "Twinkling Light", "Glitter Lighting", 
  "Sparkle Lighting", "Lens Glow", "Lens Flare", "Anamorphic Flare", "Cinematic Flare", 
  "Bokeh Lighting", "Soft Bokeh", "Defocused Lighting", "Shadow Lighting", "Soft Shadows", 
  "Hard Shadows", "Long Shadows", "Contact Shadows", "Ambient Occlusion", "Fake Ambient Occlusion", 
  "Screen Space Reflection", "Screen Space Illumination", "Ray Traced Lighting", "Path Traced Lighting", 
  "Subsurface Lighting", "Translucent Lighting", "Transmission Lighting"
];

const USER_CAMERAS = [
  "Static Camera", "Locked Camera", "Fixed Camera", "Centered Camera", "Symmetrical Camera", 
  "Asymmetrical Camera", "Wide Shot", "Ultra Wide Shot", "Close Up", "Extreme Close Up", 
  "Medium Shot", "Long Shot", "Macro View", "Micro View", "Top Down View", "Bird Eye View", 
  "Worm Eye View", "Eye Level View", "Low Angle", "High Angle", "Dutch Angle", "Isometric View", 
  "Axonometric View", "Orthographic View", "Perspective View", "One Point Perspective", 
  "Two Point Perspective", "Three Point Perspective", "Front View", "Rear View", "Side View", 
  "Three Quarter View", "Overhead View", "Oblique View", "Diagonal View", "Corner View", 
  "Hero Angle", "Push In", "Pull Out", "Slow Zoom In", "Slow Zoom Out", "Continuous Zoom", 
  "Dolly In", "Dolly Out", "Truck Left", "Truck Right", "Slide Left", "Slide Right", "Pan Left", 
  "Pan Right", "Tilt Up", "Tilt Down", "Pedestal Up", "Pedestal Down", "Crane Up", "Crane Down", 
  "Boom Up", "Boom Down", "Jib Movement", "Orbit Left", "Orbit Right", "Full Orbit", "Half Orbit", 
  "Arc Left", "Arc Right", "Circular Orbit", "Spiral Orbit", "Helical Orbit", "Vertical Orbit", 
  "Horizontal Orbit", "Tracking Shot", "Follow Camera", "Leading Camera", "Trailing Camera", 
  "Target Lock Camera", "Object Tracking", "Parallax Camera", "Multi Layer Parallax", "Depth Parallax", 
  "Foreground Parallax", "Background Parallax", "Floating Camera", "Hover Camera", "Drifting Camera", 
  "Gliding Camera", "Smooth Camera", "Steady Camera", "Stabilized Camera", "Handheld Camera", 
  "Shoulder Camera", "Gimbal Camera", "Steadicam", "FPV Camera", "Drone Camera", "Fly Through", 
  "Fly Over", "Fly Around", "Fly Past", "Fly Into", "Fly Out", "Tunnel Camera", "Corridor Camera", 
  "Portal Camera", "Infinity Camera", "Loop Camera", "Endless Camera", "Figure Eight Camera", 
  "Pendulum Camera", "Sway Camera", "Rocking Camera", "Breathing Camera", "Oscillating Camera", 
  "Bobbing Camera", "Wobble Camera", "Shake Camera", "Impact Camera", "Recoil Camera", "Whip Pan", 
  "Snap Zoom", "Crash Zoom", "Slow Reveal", "Circular Reveal", "Radial Reveal", "Spiral Reveal", 
  "Depth Reveal", "Layer Reveal", "Push Reveal", "Pull Reveal", "Transition Camera", "Portal Transition", 
  "Warp Camera", "Hyperdrive Camera", "Hyperspace Camera", "Time Warp Camera", "Space Warp Camera", 
  "Gravity Camera", "Black Hole Camera", "Zero Gravity Camera", "Floating Space Camera", "Satellite Camera", 
  "Orbital Camera", "Planet Orbit Camera", "Interior Camera", "Exterior Camera", "Architectural Walkthrough", 
  "Virtual Tour", "Showcase Camera", "Product Reveal Camera", "Gallery Camera", "Museum Camera", 
  "Exhibition Camera", "Presentation Camera", "Broadcast Camera", "Studio Camera", "Cinematic Camera", 
  "Editorial Camera", "Commercial Camera", "Corporate Camera", "Minimal Camera", "Luxury Camera", 
  "Sci-Fi Camera", "Cyberpunk Camera", "Abstract Camera", "Dynamic Camera", "Kinetic Camera", 
  "Procedural Camera", "Generative Camera", "Adaptive Camera", "Responsive Camera", "Seamless Loop Camera", 
  "Infinite Loop Camera", "Continuous Motion Camera", "Slow Motion Camera", "Time Lapse Camera", 
  "Hyperlapse Camera"
];

const ALL_206_STRUCTURAL_ARCHETYPES = [
  "Wireframe Polygon Mesh", "Low Poly Faceted Surface", "Triangular Tessellation", "Diamond Lattice Framework",
  "Honeycomb Hexagonal Grid", "Circular Radial Matrix", "Concentric Ring Geometry", "Sacred Geometry Mandala",
  "Penrose Impossible Geometry", "Möbius Strip Surface", "Fractal Recursive Structure", "Geodesic Dome Framework",
  "Parametric Surface Flow", "Continuous Contour Mesh", "Isoline Elevation Surface", "Ribbon Loop Geometry",
  "Infinite Loop Structure", "Wave Interference Field", "Radial Burst Structure", "Sunburst Ray Composition",
  "Dynamic Speed Line Field", "Parallel Stripe Matrix", "Chevron Directional Pattern", "Zigzag Linear Rhythm",
  "Crosshatch Linear Field", "Wireframe Landscape Surface", "Pixel Matrix Structure", "Pixelated Mosaic Grid",
  "Dot Matrix Array", "Halftone Dot Field", "Binary Data Stream", "Digital Scanline Pattern",
  "Glitch Fragmentation Field", "Data Flow Streamlines", "Circuit Board Pathways", "Printed Circuit Trace Layout",
  "Microchip Blueprint Layout", "Neural Network Topology", "Quantum Particle Field", "Magnetic Flux Lines",
  "Electromagnetic Wave Field", "DNA Double Helix Structure", "Molecular Bond Network", "Atomic Orbital Diagram",
  "Crystal Lattice Structure", "Snowflake Crystal Symmetry", "Liquid Blob Morphology", "Fluid Marble Surface",
  "Ink Diffusion Pattern", "Smoke Ribbon Flow", "Silk Fabric Drapery", "Velvet Fold Surface",
  "Water Ripple Field", "Ocean Current Streamlines", "Sand Dune Waveforms", "Lava Flow Surface",
  "Bubble Cluster Formation", "Droplet Splash Geometry", "Foam Cellular Surface", "Gel Capsule Structure",
  "Melted Surface Morphology", "Glass Refraction Surface", "Frosted Glass Texture", "Transparent Acrylic Layers",
  "Chrome Reflective Surface", "Liquid Metal Morphology", "Brushed Metal Grain", "Carbon Fiber Weave",
  "Woven Textile Structure", "Knit Fabric Pattern", "Ceramic Tile Layout", "Stone Mosaic Surface",
  "Marble Vein Structure", "Concrete Panel Surface", "Paper Cut Layering", "Folded Card Geometry",
  "Layered Sheet Composition", "Floating Geometric Islands", "Floating Abstract Forms", "Negative Space Composition",
  "Minimal Shape Balance", "Window Shadow Projection", "Architectural Column Rhythm", "Staircase Perspective Geometry",
  "Modern Facade Paneling", "Cantilever Structural Form", "Pavilion Frame Structure", "Shoji Panel Grid",
  "Wooden Slat Rhythm", "Brutalist Concrete Massing", "Arch Tunnel Perspective", "Dome Interior Geometry",
  "Spiral Staircase Helix", "Skyline Silhouette Layers", "Mountain Ridge Silhouette", "Forest Canopy Silhouette",
  "Desert Horizon Layers", "Leaf Vein Network", "Tree Branch Fractal", "Root Network Structure",
  "Coral Branch Formation", "Spider Web Geometry", "Feather Barb Structure", "Butterfly Wing Symmetry",
  "Mushroom Gill Pattern", "Honeycomb Wax Cells", "Cellular Membrane Pattern", "Orbital Ring System",
  "Planetary Orbit Diagram", "Star Constellation Map", "Galaxy Spiral Structure", "Nebula Cloud Formation",
  "Black Hole Accretion Ring", "Aurora Light Curtains", "Laser Beam Matrix", "Fiber Optic Threads",
  "Volumetric Light Shafts", "Plasma Energy Field", "Holographic Diffraction Surface", "Chromatic Dispersion Field",
  "Prism Light Refraction", "Caustic Light Pattern", "Ripple Interference Rings", "Acoustic Wave Pattern",
  "Spiral Energy Field", "Vibration Frequency Lines", "Polar Coordinate Grid", "Cartesian Blueprint Grid",
  "Blueprint Technical Drawing", "Exploded View Diagram", "Isometric Technical Blueprint", "Axonometric Projection Grid",
  "Section Cut Diagram", "Structural Skeleton Framework", "Modular Block Assembly", "Cubic Voxel Matrix",
  "Rectangular Panel Tessellation", "Rhombus Tile Matrix", "Octagonal Tile Network", "Pentagon Surface Tiling",
  "Circular Cell Packing", "Elliptical Orbit Array", "Capsule Shape Array", "Pill Form Composition",
  "Disc Layer Stack", "Floating Ring Array", "Hollow Frame Geometry", "Skeleton Line Framework",
  "Edge Outline Network", "Minimal Vector Scaffold", "Structural Beam Lattice", "Cable Suspension Network",
  "Tension Wire Structure", "Suspension Bridge Geometry", "Dome Rib Structure", "Shell Surface Geometry",
  "Voronoi Fracture Cells", "Delaunay Triangle Network", "Penrose Tile Tessellation", "Truchet Tile Pattern",
  "Wang Tile System", "Girih Islamic Geometry", "Quasicrystal Pattern", "Apollonian Gasket",
  "Sierpinski Triangle", "Sierpinski Carpet", "Koch Snowflake Curve", "Dragon Curve",
  "Hilbert Space Filling Curve", "Peano Curve", "Gosper Curve", "L-System Branch Structure",
  "Reaction Diffusion Pattern", "Turing Pattern Field", "Metaball Surface", "Iso Surface Mesh",
  "Scalar Field Contours", "Vector Field Streamlines", "Flow Field Particles", "Curl Noise Field",
  "Perlin Noise Terrain", "Cellular Automata Grid", "Voronoi Foam Structure", "Bubble Packing Field",
  "Circle Packing Pattern", "Sphere Packing Structure", "Fibonacci Spiral Layout", "Golden Ratio Grid",
  "Golden Rectangle Composition", "Phyllotaxis Arrangement", "Radial Phyllotaxis", "Sunflower Seed Layout",
  "Spiral Galaxy Arms", "Polar Spiral Grid", "Logarithmic Spiral", "Hyperbolic Grid",
  "Hyperbolic Tessellation", "Escher Tessellation", "Kaleidoscope Symmetry", "Bilateral Symmetry Layout",
  "Rotational Symmetry Array", "Mirror Symmetry Plane", "Translational Symmetry Grid", "Glide Reflection Pattern",
  "Recursive Branch Network", "Recursive Polygon Growth"
];

/**
 * Helper to pick a truly random archetype from ALL_206_STRUCTURAL_ARCHETYPES
 * while guaranteeing NO duplicates across the current batch run.
 */
export function getUniqueRandomArchetype(usedArchetypes: string[] = []): string {
  const available = ALL_206_STRUCTURAL_ARCHETYPES.filter(a => !usedArchetypes.includes(a));
  const pool = available.length > 0 ? available : ALL_206_STRUCTURAL_ARCHETYPES;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];
  usedArchetypes.push(selected);
  return selected;
}

const USER_COMPOSITIONS = [
  "Layered 3D Parallax Planes", "Symmetrical Radial Mandalas", "Dynamic Grid-Aligned Bento Boxes", 
  "Fluid Organic Overlapping Slabs", "Concentric Nested Spherical Shells", "Isometric Volumetric Extrusions", 
  "Algorithmic Voronoi Tessellations", "Cascading Linear Ribbon Ribs", "Infinite Receding Perspective Corridors", 
  "Staggered Offset Interlocking Plates", "Diagonal Sweeping Curvilinear Belts", "Triangulated Tension Membrane Network", 
  "Bento Grid-like Dynamic Panels", "Embossed Bas-Relief Structural Planes"
];

const USER_VISUAL_EFFECTS = [
  "subtle continuous sRGB color-shift gradient flow with soft ambient depth",
  "ultra-smooth silk surface curvature with soft ambient occlusion shadows",
  "clean satin sheen highlights gently breathing along organic surface contours",
  "frosted glass depth reflection with ultra-subtle ambient lighting shifts",
  "high-precision smooth vector wave gradient transitions",
  "subtle harmonic wave ripples with clean gradient shading",
  "soft volumetric ambient depth glow integrated seamlessly into background surfaces",
  "smooth iridescent surface shimmer blending softly across gradient layers"
];

const VIBRANT_COLOR_PALETTES = [
  "Sunset Blaze (Vibrant Orange, Intense Magenta, Sunset Gold, Deep Crimson Burgundy & Royal Purple)",
  "Cyber Aurora (Neon Cyan, Ultraviolet Glow, Electric Green, Lime Sparkle & Cosmic Blue)",
  "Gold Empress (Imperial Burnished Gold, Metallic Copper, Amber Spark, Ebony Black & Soft Ivory Shimmer)",
  "Royal Nebula (Vibrant Orchid Pink, Royal Violet, Laser Indigo, Electric Cyan & Midnight Blue)",
  "Arctic Aurora (Frosted Sky Blue, Vibrant Mint Green, Emerald Forest, Cool Teal & Pearl Platinum)",
  "Holographic Pearl (Iridescent Opal, Pearl Shell Pink, Silver Chrome, Pale Amethyst & Soft Cyan Shimmer)",
  "Copper Flame (Warm Bronze, Glowing Terracotta, Amber Fire, Dark Slate & Metallic Brass Highlights)",
  "Cosmic Indigo (Midnight Velvet, Intense Cyan, Magenta Spark, Laser Indigo & Pale Quartz)"
];

export function generateSmoothLiquidBackgroundPrompt(
  isPremium3D: boolean = true,
  conceptText?: string,
  selectedIconStyle?: string,
  variationIndex: number = 0,
  usedArchetypes: string[] = []
): RandomBackgroundResult {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 100000);
  const uniqueSeed = `NON-KOMBINASI-VAR${variationIndex + 1}-${timestamp}-${randomValue}`;

  const selectedArchetype = getUniqueRandomArchetype(usedArchetypes);

  // Random selection across all 9 custom creative layers, blending in the 1000+ visual style directions to avoid monotony
  let selectedTheme = Math.random() > 0.5 
    ? USER_THEMES[(variationIndex + randomValue) % USER_THEMES.length]
    : VISUAL_DIRECTIONS_1000[(variationIndex + randomValue) % VISUAL_DIRECTIONS_1000.length];

  if (conceptText && conceptText.trim()) {
    selectedTheme = conceptText.trim();
  }

  const selectedTheme2 = Math.random() > 0.5
    ? USER_THEMES[(variationIndex + randomValue + 1) % USER_THEMES.length]
    : VISUAL_DIRECTIONS_1000[(variationIndex + randomValue + 1) % VISUAL_DIRECTIONS_1000.length];

  // If selectedIconStyle is specified, strictly enforce that selected style!
  const selectedStyle = (selectedIconStyle && selectedIconStyle.trim())
    ? selectedIconStyle.trim()
    : Math.random() > 0.5
      ? USER_STYLES[(variationIndex + randomValue) % USER_STYLES.length]
      : VISUAL_DIRECTIONS_1000[(variationIndex + randomValue) % VISUAL_DIRECTIONS_1000.length];

  const selectedMaterial = USER_MATERIALS[(variationIndex + randomValue) % USER_MATERIALS.length];
  const selectedMotion = USER_MOTIONS[(variationIndex + randomValue) % USER_MOTIONS.length];
  const selectedLighting = USER_LIGHTINGS[(variationIndex + randomValue) % USER_LIGHTINGS.length];
  const selectedCamera = USER_CAMERAS[(variationIndex + randomValue) % USER_CAMERAS.length];
  const selectedColor = VIBRANT_COLOR_PALETTES[(variationIndex + randomValue) % VIBRANT_COLOR_PALETTES.length];
  const selectedEffect = USER_VISUAL_EFFECTS[(variationIndex + randomValue) % USER_VISUAL_EFFECTS.length];

  // Random mathematical parameters for SVG generation diversity
  const speedVal = (0.15 + Math.random() * 0.45).toFixed(2);
  const ampVal = Math.floor(45 + Math.random() * 80);
  const freqVal = (0.04 + Math.random() * 0.16).toFixed(3);
  const angleOffset = Math.floor(Math.random() * 360);

  const depthDirective = isPremium3D
    ? `- Sisi kedalaman tak terbatas: Rancang dengan bayangan jatuh (drop shadows), specular highlight, emboss/deboss halus pada tepi-tepi material, gradient berkilau (bright sheen), dan ambient occlusion kustom untuk menghasilkan ilusi 3D ruang yang kuat dan berkelas.`
    : `- Tampilan Vektor 2D Flat: Rancang dengan estetika vector flat minimalis 2D murni tanpa bayangan jatuh tebal, tanpa efek timbul/emboss, tanpa efek miring/extrude, melainkan menggunakan tumpukan warna linear datar 2D yang bersih, paduan warna kontemporer datar yang harmonis, dan garis outline tipis yang elegan.`;

  const styleDirective = isPremium3D
    ? `STYLE (Tampilan Visual): ${selectedStyle} (Semi 3D Depth)`
    : `STYLE (Tampilan Visual): ${selectedStyle} (Flat 2D Vector Layout)`;

  const finalPrompt = `KOMPOSISI NON-KOMBINASI CINEMATIC BACKGROUND SURFACE (VARIASI KE-${variationIndex + 1} - COMMERCIAL MICROSTOCK BESTSELLER):
  
  MANDATORI BEBAS DUPLIKASI & KHAS VARIATIVE 50X (STRICT 50X NON-SIMILARITY & UNIQUE GEOMETRY):
  - VARIASI KE-${variationIndex + 1} INI WAJIB MEMILIKI GEOMETRI, BENTUK BENTUK STRUKTUR, DAN ALIRAN GERAKAN YANG BENAR-BENAR UNIK DANKHAS.
  - STRUKTUR VISUAL UTAMA VARIASI INI: "${selectedArchetype}".
  - BENTUK VISUAL DAN ARSITEKTUR HARUS BERADAPTASI SECARA AKURAT TERHADAP ARKETIPE "${selectedArchetype}" (misal: kisi/grid geometris, jaringan konstelasi titik, pola kristal/prisma, pita melayang, kubus isometrik, lipatan kertas origami, bola kaca melayang, dll. JANGAN MEMAKSAKAN GELOMBANG/WAVE JIKA TIDAK SESUAI ARKETIPE).
  
  MANDATORI ATURAN KERAS CINEMATIC & BEBAS CACAT VISUAL / ARTEFAK KODE:
  1. HASIL VISUAL WAJIB CINEMATIC, MULUS, TANPA CACAT VISUAL, BERSIH, DAN BEBAS DARI ARTEFAK KODE APA PUN (No syntax errors in SVG, no missing keyframes, no jagged paths, no NaN coordinates, no broken gradients, no flickering).
  2. KUALITAS DERAJAT KOMERSIAL TINGKAT ATAS (MICROSTOCK BESTSELLER): Hasil visual wajib memiliki estetika cinematic mewah, profesional, berpendar tinggi, dan siap lisensi untuk Adobe Stock, Freepik/Magnific AI, Shutterstock, dan Envato Elements.
  
  SISTEM GENERATOR BACKGROUND PREMIUM 9-LAYER:
  1. THEME (Topik Utama Trending Microstock): "${selectedTheme}" dengan aksen "${selectedTheme2}"
  2. ${styleDirective}
  3. MATERIAL (Bahan Fisik Cinematic): ${selectedMaterial}
  4. COMPOSITION & ARCHETYPE (Bentuk Geometri Canvas): ${selectedArchetype}
  5. MOTION (Gerakan Dinamis Flowing): ${selectedMotion}
  6. LIGHTING (Pencahayaan Studio/Atmospheric): ${selectedLighting}
  7. CAMERA (Gerakan Kamera/Perspektif): ${selectedCamera}
  8. COLOR PALETTE (Palet Warna High-Contrast Anti-Pucat): ${selectedColor}
  9. VISUAL EFFECTS (Efek Refraksi/Glow/Dispersi): ${selectedEffect}
  
  MANDATORI BEBAS HUD, TEKS & ELEMEN DISTRAKSI (STRICT NO HUD / NO LENS FLARES / NO TRAVELLING LIGHT STREAKS / NO BOKEH DOTS):
  - DILARANG SEKALI-KALI menambahkan elemen HUD, status FPS, frame count, timeline, bounding box, watermark, teks, angka, huruf, atau logo apa pun.
  - DILARANG KERAS MEMBUAT ELEMEN KILAUAN CAHAYA BERJALAN, TRAVELLING LIGHT PULSE, HORIZONTAL LENS FLARE SCANNING, SPOTLIGHT SWEEP, BOKEH CIRCLES / BINTIK CAHAYA FLOATING, ATAU LIGHT BEAM YANG MELINTAS DARI KIRI KE KANAN FRAME DI TENGAH CANVAS.
  - SELURUH PERMUKAAN LALUAN DAN ELEMEN WAJIB CLEAN, UNIFORM, SMOOTH, ELEGAN, DAN TERSTABILISASI SEBAGAI BACKGROUND SURFACE MURNI TANPA BINTIK CAHAYA ATAU FLARE DISTRAKSI DI TENGAH FRAME.
  
  KARAKTERISTIK STRUKTUR UTAMA:
  - WAJIB berupa PREMIUM BACKGROUND SURFACE / TEXTURE, murni berupa surface latar belakang mengalir mulus yang menutup seluruh layar 4K/Full HD TANPA CELAH latar kosong.
  - ${depthDirective}
  - Animasi pergerakan ultra-smooth 60 FPS: Gerakan dinamis ${selectedMotion}, rotasi fasa tergeser, pergerakan harmonis diagonal dengan offset ${angleOffset}°, multiplier kecepatan dinamis ${speedVal}x. Aliran harus mengalir terus menerus secara seamless 60 FPS tanpa tersendat-sendat.`;

  return {
    prompt: finalPrompt,
    title: formatFizkesPopovTitle(`${selectedTheme} ${selectedStyle}`, {
      brief: selectedTheme,
      style: selectedStyle,
      is3D: isPremium3D,
    })
  };
}

export function generateStrictCustomConceptPrompt(
  index: number,
  conceptText: string,
  isPremium3D: boolean = true,
  selectedIconStyle?: string,
  usedArchetypes: string[] = []
): RandomBackgroundResult {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 100000);
  const uniqueSeed = `CUSTOM-CONCEPT-VAR${index + 1}-${timestamp}-${randomValue}`;

  const cleanConcept = conceptText.trim() || "modern visual layout";

  const selectedArchetype = getUniqueRandomArchetype(usedArchetypes);

  // Truly randomize, shuffle, and choose from the 1000+ visual style directions list.
  // If selectedIconStyle is provided, strictly use that style direction.
  const styleIndex = (index + randomValue) % VISUAL_DIRECTIONS_1000.length;
  const selectedStyleDirection = (selectedIconStyle && selectedIconStyle.trim())
    ? selectedIconStyle.trim()
    : VISUAL_DIRECTIONS_1000[styleIndex];

  const selectedColor = VIBRANT_COLOR_PALETTES[(index + randomValue) % VIBRANT_COLOR_PALETTES.length];

  // The style direction adapts perfectly to the user's custom concept, blending them beautifully.
  const selectedDirective = `VARIASI KE-${index + 1} (${selectedStyleDirection.toUpperCase()} STYLE & ${selectedArchetype.toUpperCase()} STRUCTURE):
  Rancang dan implementasikan konsep "${cleanConcept}" secara presisi dengan memadukannya secara harmonis dengan gaya visual "${selectedStyleDirection}" dan struktur arketipe "${selectedArchetype}". 
  Seluruh elemen, bentuk SVG, jalur (paths), kecepatan gerak, dan pendaran warna sRGB yang vibrant (${selectedColor}) wajib menyesuaikan diri untuk mengekspresikan perpaduan sempurna antara konsep utama "${cleanConcept}", estetika "${selectedStyleDirection}", dan arketipe "${selectedArchetype}". JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel.`;

  const speedVal = (0.2 + Math.random() * 0.75).toFixed(2);
  const ampVal = Math.floor(45 + Math.random() * 95);
  const freqVal = (0.04 + Math.random() * 0.22).toFixed(3);
  const angleOffset = Math.floor(Math.random() * 360);

  const depthDirective = isPremium3D
    ? `MANDATORY TEKNIK VISUAL SEMI 3D DEPTH:
    * Gunakan proyeksi kamera 3D virtual, gradient bayangan timbul, drop shadows nyata, specular highlight, emboss/deboss, dan ambient occlusion kustom untuk menciptakan ilusi volume visual 3D yang megah.`
    : `MANDATORY TEKNIK VISUAL FLAT 2D VECTOR:
    * Gunakan estetika flat vector 2D minimalis yang bersih tanpa drop shadows tebal, tanpa extrude, melainkan menggunakan tumpukan warna linear murni yang rapi dan garis outline tipis yang elegan.`;

  // Provide a rich variety of motion dynamics tailored to the concept
  const MOTION_TYPES = [
    "Rotasi 3D orbital dan pergeseran fasa harmonis",
    "Float sinewave 3D dan tilt perspektif halus",
    "Pulsasi ekspansi geometris dan skalasi fasa tergeser",
    "Morphing kurva Bezier dan pergeseran gradien fluid",
    "Aliran partikel terarah dan pergerakan bidang permukaan (surface flow)",
    "Osilasi simetris dinamis dan pergeseran sudut offset",
    "Pergerakan kisi (mesh) interaktif dan translasi bidang sRGB",
    "Pulsasi skala melingkar dan pergeseran gelombang sinus-kosinus",
    "Pusaran spiral fluid dan pembiasan spektrum prisma",
    "Pendaran warna berlapis dan pergeseran kontur topografi"
  ];
  const selectedMotionType = MOTION_TYPES[(index + randomValue) % MOTION_TYPES.length];

  const finalPrompt = `KOMPOSISI KONSEP KUSTOM MANDIRI (VARIASI KE-${index + 1} DARI BATCH BANYAK)
  
  Misi Anda adalah membuat visual animasi kustom premium tingkat dunia yang berfokus penuh dan beradaptasi secara presisi terhadap konsep di bawah ini.
  
  TEMA & FORMA UTAMA YANG HARUS DIWAKILI SECARA PENUH:
  "${cleanConcept}"
  
  ATURAN STRICT 50X NON-SIMILARITY & UNIQUE GEOMETRY (MANDATORI HIKMAT):
  - VARIASI KE-${index + 1} INI WAJIB MEMILIKI GEOMETRI, SHAPE SVG, DAN EFEK VISUAL UNIK YANG BERBEDA DARI VARIASI LAINNYA.
  - ARKETIPE STRUKTUR UTAMA UNTUK VARIASI INI: "${selectedArchetype}".
  - PALET WARNA KHAS VARIASI INI: "${selectedColor}".
  - JANGAN MEMAKSAKAN SEMUA HASIL BEBERAPA GELOMBANG/WAVE JIKA KONSEP TIDAK MEMINTANYA ATAU ARKETIPE ADALAH GRID/KRISTAL/KUBUS/KONSTELASI! Jika konsep atau arketipe meminta bentuk kisi/grid geometris, jaringan konstelasi titik, pola kristal 3D, kubus isometrik, pita melayang, lipatan origami, atau bola melayang, buatlah bentuk SVG yang merepresentasikan arketipe tersebut secara presisi, profesional, dan kaya detail.
  
  ARAHAN GAYA DAN VARIASI KHAS KE-${index + 1}:
  ${selectedDirective}
  
  ATURAN VISUAL EDGE-TO-EDGE & SEAMLESS (SANGAT KETAT):
  - Visual dirancang agar Edge-to-Edge, padat, megah, dan memiliki nilai komersial tinggi setara aset microstock premium (Shutterstock/Adobe Stock).
  - Wajib memenuhi keempat sudut frame 4K (3840x2160) dari ujung ke ujung secara presisi (surface) tanpa menyisakan celah latar belakang polos datar atau area kosong di sekitarnya.
  - Skema gradasi warna yang VIBRANT berpendar tinggi (${selectedColor}, sRGB murni bersaturasi cerah tinggi, kontras tajam, anti-pucat).
  
  ATURAN ANTI-HUD / ANTI-DIAGNOSTIC (SANGAT KETAT):
  Sama sekali TIDAK BOLEH menampilkan elemen HUD (Heads-Up Display) atau panel kontrol/debug apa pun pada visual latar belakang, termasuk:
  - Informasi FPS, Current frame, Timeline, Playback controls, Safe area, Bounding box elemen, Debug information, atau ornamen diagnostic overlays.
  
  DURASI DAN ANIMASI:
  - Tipe gerakan dinamis: ${selectedMotionType} (multiplier kecepatan ${speedVal}x, frekuensi ${freqVal}Hz, sudut offset ${angleOffset}°).
  - Aliran animasi harus mengalir terus menerus secara seamless loop 60 FPS tanpa ada jeda/lompatan visual.
  - Sama sekali tidak boleh ada huruf, angka, kata, teks, atau logo apa pun.
  
  MANDATORI DILARANG ELEMEN DISTRAKSI / LIGHT STREAK / LENS FLARE / BOKEH DOTS:
  - DILARANG KERAS MEMBUAT ELEMEN KILAUAN CAHAYA BERJALAN, TRAVELLING LIGHT PULSE, HORIZONTAL LENS FLARE SCANNING, SPOTLIGHT SWEEP, BOKEH CIRCLES / BINTIK CAHAYA FLOATING, ATAU LIGHT BEAM YANG MELINTAS DARI KIRI KE KANAN FRAME DI TENGAH CANVAS.
  - SELURUH PERMUKAAN LALUAN DAN ELEMEN WAJIB CLEAN, UNIFORM, SMOOTH, ELEGAN, DAN TERSTABILISASI SEBAGAI BACKGROUND SURFACE MURNI TANPA BINTIK CAHAYA ATAU FLARE DISTRAKSI DI TENGAH FRAME.
  
  ${depthDirective}

  ATURAN NON-REPETISI & SEED KHAS:
  - Gunakan SEED ID UNIK berikut untuk kalkulasi matematika acak, pergeseran fasa bezier, dan koordinat offset: "${uniqueSeed}".
  - Pastikan struktur jalur matematika vektor (SVG paths) dan bentuk elemen benar-benar baru, inovatif, mempresentasikan konsep "${cleanConcept}" dengan arketipe "${selectedArchetype}", dan belum pernah dibuat sebelumnya.
  `;

  const cleanTitle = formatFizkesPopovTitle(cleanConcept, {
    brief: cleanConcept,
    style: selectedStyleDirection,
    is3D: isPremium3D,
  });

  return {
    prompt: finalPrompt,
    title: cleanTitle
  };
}

const VISUAL_DIRECTIONS_1000 = [
  "Infinite Continuum", "Harmonic Wave", "Layer Cascade", "Fractal Landscape", "Rock Strata",
  "Bubble Field", "Reflection Field", "Reef Structure", "Glass Mosaic", "Pigment Flow",
  "Deflate Motion", "Diamond Tessellation", "Wire Mesh", "Soft Cushion Forms", "Folded Velvet",
  "Voronoi Cells", "Unified Surface", "Adaptive Grid", "Curved Grid", "Helix Tunnel",
  "Resonance Waves", "Alcohol Ink Flow", "Infinite Loop", "Infinite Surface", "Pneumatic Form",
  "Matrix Stream", "Ink Diffusion", "Collapse Motion", "Radar Sweep", "Silver Foil",
  "DNA Lattice", "Cosmic Dust", "Dust Field", "Tidal Motion", "Dynamic Tessellation",
  "Velvet Surface", "Vibrating Surface", "Crystal Growth", "Color Drift", "Fluid Mosaic",
  "Capsule Array", "Wet Glass", "Crystal Shards", "Glow Particles", "Rotational Symmetry",
  "Algae Bloom", "Energy Tunnel", "Data Highway", "Space Curvature", "Crystal Tunnel",
  "Shadow Box Layers", "Infinite Chamber", "Elastic Structure", "Woven Surface", "Low Poly Surface",
  "Infinity Knot", "Digital Interface", "Octagonal Cells", "Gradient Mesh", "Resonance Field",
  "Fluid Architecture", "Fractal Bloom", "Rainbow Spectrum", "Acrylic Sheets", "Penrose Tiling",
  "Stardust Cloud", "Harmonic Surface", "Braided Ribbon", "Holographic Tunnel", "Temporal Flow",
  "Chain Reaction", "Surface Transformation", "Precision Geometry", "Equirectangular Mapping", "Mesh Fabric",
  "Jellyfish Motion", "Interference Pattern", "Fishing Net Pattern", "Floating Prisms", "Expand Motion",
  "Dynamic Mesh", "Decorative Tessellation", "Muscle Fibers", "Glass Waves", "Floating Roof",
  "Voxel Tunnel", "Domino Effect", "Bubble Membrane", "Infinity Loop Flow", "Ripple Cascade",
  "Wave Canopy", "Mathematical Surface", "Fractal Spiral", "Explosion Motion", "Corona Field",
  "Web Network", "Fluid Pigments", "Satellite Orbit", "Layered Mosaic", "Organic Cells",
  "Stretch Morph", "Coordinate Field", "Blood Stream", "Layer Compression", "Backlit Surface",
  "Pendulum Swing", "Surface Projection", "Ribbon Flow", "Potential Field", "Pulse Rings",
  "Fibonacci Spiral", "Color Waves", "Particle Tunnel", "Barycentric Surface", "Floating Grid",
  "Generative Motion", "Double Spiral", "Light Refraction", "Energy Volume", "Ice Glass",
  "Morphing Tessellation", "Color Vapor", "Leaf Veins", "Spiral Flow", "Texture Projection",
  "Paper Layers", "Floating Slabs", "Radar Display", "Random Walk", "Infinite Composition",
  "Perspective Warp", "Mosaic Pattern", "Julia Set", "Carbon Fiber", "Ambient Volume",
  "Branching Network", "Information Flow", "Data Cascade", "Parallel Space", "Curtain Wall",
  "Resonance Pulse", "Braided Geometry", "Halo Lighting", "Collective Motion", "Kinetic Rotation",
  "Wave Ribbon", "Orbital Particles", "Voronoi Tessellation", "Floral Canopy", "Elastic Morph",
  "Gel Membrane", "Reflective Plane", "Penrose Structure", "Offset Grid", "Dichroic Glass",
  "Forest Canopy", "Relief Map", "Mandelbrot Field", "Bloom Halo", "Dispersion Field",
  "Elliptical Galaxy", "Neon Tunnel", "Wireframe Grid", "Mirror Fragments", "Folded Paper Stack",
  "Fractal Waves", "Lattice Framework", "Cylindrical Projection", "Floating Landscape", "Tetrahedron Array",
  "Honeycomb Matrix", "Heartbeat Pulse", "Morphing Surface", "Vibrational Motion", "Diffraction Pattern",
  "Organic Blending", "Water Current", "Standing Wave", "Emergent Motion", "Vector Field Flow",
  "Dimensional Fold", "Glass Tunnel", "Apollonian Gasket", "Isometric Blocks", "Hyperspace Tunnel",
  "Hair Flow", "Signal Spectrum", "Swept Surface", "Printed Electronics", "Surface Mesh",
  "Kaleidoscope Pattern", "Reflective Lighting", "Liquid Ribbon", "Cellular Membrane", "Suspended Textile",
  "Layered Horizon", "Optical Spectrum", "Pleated Surface", "Mirror Symmetry", "Tension Membrane",
  "Ripple Field", "Light Shafts", "Woven Lattice", "Dimensional Composition", "Audio Spectrum",
  "Floating Particles", "Orbital Motion", "Sound Waves", "Oscillation Mesh", "Celtic Knot",
  "Dynamic Gradient", "Orbital Flow", "Gradient Illumination", "Photon Waves", "Breathing Motion",
  "Tile Mosaic", "Color Flow", "Stretch Fabric", "Procedural Mesh", "Floating Plates",
  "Infinite Reflection", "Geodesic Sphere", "Dreamscape", "River Delta", "Bilateral Symmetry",
  "Wormhole", "Ambient Occlusion Surface", "Unified Flow", "Caustic Patterns", "Digital Fabric",
  "Sphere Array", "Shockwave Expansion", "Metallic Mesh", "Tentacle Motion", "Recursive Geometry",
  "Spiral Tunnel", "Dome Structure", "Mechanical Rhythm", "Fractal Symmetry", "Matrix Lattice",
  "Metallic Reflection", "Escher Space", "Bacteria Colony", "Kelp Forest", "Warp Field",
  "Vortex Flow", "Biofilm Growth", "Layer Stack", "Volcanic Terrain", "Recursive Branches",
  "Mesh Scanner", "Confetti Burst", "Iridescent Field", "Frosted Glass", "Breathing Surface",
  "Energy Particles", "Fractal Network", "Optical Illusion", "Spectral Surface", "Parametric Facade",
  "Fluid Membrane", "Braided Surface", "Motion Landscape", "Modular Blocks", "Flower Bloom",
  "Satin Chrome", "Sci-Fi Landscape", "Premium Motion", "Structural Framework", "Faceted Geometry",
  "Helix Flow", "Decal Projection", "Torus Array", "NURBS Surface", "Ambient Glow",
  "Spectral Dispersion", "Algorithm Visualization", "Ocean Swell", "Cylinder Array", "Surface Wrapping",
  "Titanium Sheets", "Multi Gradient", "Amoeba Morph", "Curtain Folds", "Precision Framework",
  "Ceramic Surface", "Lichen Pattern", "Formula Field", "Fabric Waves", "Topology Morph",
  "Silicon Wafer", "Silk Ribbon", "Phi Geometry", "Minimal Landscape", "Synthetic Framework",
  "Geometric Composition", "Abstract Horizon", "Computational Geometry", "Water Droplets", "Canyon Layers",
  "Volumetric Rays", "Quantum Grid", "Twist Morph", "Extruded Layers", "Infinite Tessellation",
  "Velvet Drapery", "Architectural Facade", "Technical Grid", "Delaunay Mesh", "Schematic Flow",
  "Rotated Grid", "Velvet Waves", "Nebula Cloud", "Organic Composition", "Membrane Surface",
  "Sonar Pulse", "Lava Flow", "UV Flow", "Dynamic Grid", "Cinematic Flow",
  "Quantum Field", "Prism Mosaic", "Plasma Storm", "Lens Distortion", "Boolean Geometry",
  "Harmonic Composition", "Warp Grid", "Unified System", "Aurora Sky", "Paper Cut",
  "Fantasy Landscape", "Parametric Mesh", "Twisted Surface", "Electric Field", "Crystal Dust",
  "Thread Field", "Fog Layer Drift", "Force Field", "Cosmic Landscape", "Axonometric Blocks",
  "Undulating Surface", "Gradient Field", "Perspective Blocks", "AI Network", "Wireframe World",
  "Light Diffusion", "Particle Swarm", "Foam Surface", "Time Distortion", "Prism Array",
  "Faceted Facade", "Hard Bloom", "Alien Terrain", "Pixel Particles", "Unified Structure",
  "Neural Network", "Brownian Motion", "Elastic Grid", "Black Hole Accretion", "Cartesian Mesh",
  "Protein Folding", "Centrifugal Motion", "Lofted Surface", "Rhythmic Composition", "Petal Spiral",
  "Layer Separation", "Cell Growth", "Condensation Layer", "Abstract Framework", "Unified Space",
  "Transparent Layers", "Solar Surface", "Radial Symmetry", "Branch Network", "Soft Bloom",
  "Floating Islands", "Fisheye Projection", "Neural Web", "Organic Network", "Folded Architecture",
  "Powder Cloud", "Cyber Dimension", "Gemstone Surface", "Silk Drapery", "Anamorphic Flare",
  "Carved Surface", "Edge Glow", "Boid Flocking", "Mesh Network", "Inflate Motion",
  "Inflatable Surface", "Precision Wireframe", "Abstract Motionscape", "Simplex Flow", "Floating Diamonds",
  "Visual Continuum", "Floating Textile", "Flowing Gradient", "Organic Cells", "Metallic Architecture",
  "Circuit Board", "Spatial Continuum", "Iridescent Surface", "Caustic Lighting", "Hex Cells",
  "Color Field", "Quad Mesh", "Recursive Space", "Magnetic Stream", "Spatial Distortion",
  "Binary Rain", "Mirror Mosaic", "Valley Basin", "Polar Coordinates", "Wrinkled Surface",
  "Recursive Forms", "Diamond Facets", "Unified Field", "Octahedron Array", "Parametric Geometry",
  "Cloud Sea", "Watercolor Diffusion", "Neural Tissue", "Triangular Tessellation", "Inner Shadow Relief",
  "Radial Grid", "Pulsing Glow", "Swirl Flow", "Motion Sculpture", "Fiber Optic Network",
  "Radiant Energy Field", "Perlin Flow", "Dream Field", "Chiseled Geometry", "Honeycomb Structure",
  "Harmonic Oscillation", "Net Structure", "Dew Surface", "Contour Rings", "Floating Cards",
  "Morphing Geometry", "Glass Canopy", "Leaf Canopy", "Motion Canvas", "Brushed Aluminum",
  "Polar Projection", "God Rays", "Floating Crystals", "Layered Architecture", "Sky Platforms",
  "Electric Storm", "Rainbow Refraction", "Storm Front", "Cyber Surface", "Glitter Storm",
  "Height Map", "Ripple Rings", "Islamic Geometry", "Layered Composition", "Surreal Space",
  "Gyroscopic Motion", "Minimal Motion", "Iso Surface", "Precision Surface", "Frequency Field",
  "PCB Traces", "Electric Sparks", "Synaptic Web", "Ceramic Mosaic", "Morphing Grid",
  "Synapse Network", "Deep Space Field", "Isometric Grid", "Dimensional Portal", "Rope Twist",
  "Vanishing Point Field", "Satin Drapery", "Volumetric Clouds", "Endless Cube", "Algorithmic Surface",
  "Contour Lines", "Floating Fabric", "Polar Flow", "River Meander", "Gradient Bloom",
  "Sand Drift", "Orbit Rings", "Light Dispersion", "Elastic Mesh", "Solder Network",
  "Energy Core", "Modular Construction", "Fault Lines", "Elegant Motion", "Metallic Waves",
  "Blockchain Mesh", "Soft Canopy", "Density Field", "Dynamic Framework", "Fog Layers",
  "Optical Fiber Flow", "Floating Glass Panels", "Motion Echo", "Ice Ridges", "LiDAR Scan",
  "Star Cluster", "Synthetic Landscape", "Mandala Geometry", "Particle Implosion", "Ether Field",
  "Dynamic Composition", "Precision Mesh", "Neon Vapor", "Opalescent Surface", "Microchip Layout",
  "Particle Bloom", "Seabed Contours", "Tunnel Grid", "Mercury Flow", "Frost Bloom",
  "Plasma Waves", "Floating Cubes", "Fabric Mesh", "Cloud Layers", "Infinite Horizon",
  "Tree Rings", "Procedural Universe", "Digital Noise Field", "Hair Strands", "Endless Motion",
  "Triple Spiral", "Particle Ring", "Reflective Ceiling", "Chaotic Motion", "Rain Curtain",
  "Spiral Galaxy", "Holographic Interface", "Polygon Tessellation", "Capillary Flow", "Folded Canopy",
  "Spark Shower", "Cross Lighting", "Flow Field", "Vein Network", "Space Corridor",
  "Cellular Foam", "Organic Architecture", "Abstract Dimension", "Floating Architecture", "Crystal Canopy",
  "Warp Tunnel", "L-System Growth", "Data Stream", "Frozen Surface", "Fractured Glass",
  "Energy Waves", "Technical Diagram", "Soap Foam", "Mirror Reflection", "Laser Sweep",
  "Cloud Network", "Cosmic Horizon", "Petal Canopy", "Leather Texture", "Planetary Rings",
  "Fireflies", "Dynamic Wrapping", "Procedural World", "Computational Framework", "Equalizer Bars",
  "Engraved Surface", "Fresnel Reflection", "Virtual Space", "Blueprint Overlay", "Cosmic Web",
  "Synchronization Field", "Mineral Formation", "Glacier Surface", "Recursive Tessellation", "Particle Sphere",
  "Knitted Texture", "Motion Architecture", "Parametric Surface", "Dye Diffusion", "Futuristic Motion",
  "Copper Patina", "Unified Framework", "Scanning Beam", "Distortion Field", "Thread Network",
  "Flickering Light", "Mountain Ridge", "Square Tunnel", "Polygon Mesh", "Prism Reflections",
  "Biomorphic Architecture", "Reflective Fracture", "Diamond Tunnel", "Foam Cells", "Infinite Mesh",
  "Light Speed Tunnel", "Endless Landscape", "Optical Corridor", "Hex Tessellation", "Elevation Map",
  "Brushed Brass", "Revolved Surface", "Voxel Surface", "Kinetic Composition", "Hexagonal Cells",
  "Reflective Floor", "Bubble Foam", "Layered Grid", "Molten Rock", "Charged Particle Field",
  "Triangle Tessellation", "Cyber Grid", "Color Bloom", "Mesh Gradient", "Cable Bundle",
  "Air Bubbles", "Sea Anemone", "Twisted Ribbon", "Synthetic Reality", "Unified Geometry",
  "Figure Eight Flow", "Wind Current", "Light Sweep", "Floating Ribbon", "Visual Symphony",
  "Ink Particles", "Plastic Film", "Yarn Flow", "Radiant Gradient", "Tech Blueprint",
  "Circular Flow", "Debossed Surface", "Liquid Plastic", "Mercator Projection", "Unified Composition",
  "Photon Field", "Feather Layers", "Aurora Waves", "Photon Tunnel", "Recursive Pattern",
  "Creased Material", "Layer Offset", "Mist Flow", "Metaball Field", "Solar Flare",
  "Continuous Deformation", "Chromatic Refraction", "DNA Helix", "Golden Grid", "Fiber Particles",
  "Truss Structure", "Knot Structure", "Abstract Composition", "Precision Lattice", "Crystal Mosaic",
  "Space Nebula", "Wave Interference", "Floating Sheets", "Square Tessellation", "Light Corridor",
  "Extruded Geometry", "Layer Expansion", "Traveling Wave", "Interference Wave", "Interstellar Dust",
  "Mushroom Colony", "Desert Dunes", "Soft Rubber", "Reflective Passage", "Moiré Pattern",
  "Network Topology", "Studio Lighting", "Interwoven Structure", "Golden Ratio Layout", "Liquid Glass",
  "Endless Hallway", "Holographic Spectrum", "Specular Reflection", "Vine Growth", "Server Matrix",
  "Bubble Glass", "Infinity Gateway", "Procedural Modeling", "Atmospheric Mist", "Soft Neumorphic Stack",
  "Circular Tunnel", "Glass Architecture", "Modular Panels", "Pearl Surface", "Snowflake Symmetry",
  "Soap Bubbles", "Recursive Loop", "Gold Foil", "Modular Grid", "Unified Motion",
  "Cascade Motion", "Dry Mud Pattern", "Gradient Horizon", "Polygon Scanner", "Space Frame",
  "Unfold Motion", "Diamond Grid", "Cone Array", "Tree Canopy", "Layered Fabric",
  "Bubble Cluster", "Pixel Mosaic", "Time Ripple", "Cellular Structure", "Satin Waves",
  "Torque Motion", "Digital Landscape", "Terrain Displacement", "Frequency Analyzer", "Adaptive Structure",
  "Multi Plane Depth", "Heat Distortion", "Centripetal Motion", "Digital Dimension", "Sediment Layers",
  "Contact Shadows", "Smooth Union", "Dynamic Illumination", "Cellular Architecture", "Hexagonal Grid",
  "Plasma Stream", "Floating Embers", "Soft Shadow Field", "Erosion Patterns", "Rotational Dynamics",
  "Ice Crystal Growth", "Organic Mosaic", "Glass Distortion", "Cellular Network", "Frost Crystal",
  "Cellular Matrix", "Spotlight Sweep", "Hex Mesh", "Wave Cascade", "Signed Distance Field",
  "Organic Surface Drift", "Luminous Fog", "Geometric Cluster", "Wave Roof", "Perspective Grid",
  "Aurora Glow", "Origami Fold", "Floating Membranes", "Peel Motion", "Binary Stream",
  "Squash Morph", "Cushioned Surface", "Triplanar Mapping", "Electronic Pathways", "Polygon Flow",
  "Chrome Waves", "Infinite Grid", "Crystal Lattice", "Bezier Surface", "Ribbon Architecture",
  "Constructive Solid Geometry", "Parallax Stack", "Triangular Grid", "Infinite Corridor", "Data Lattice",
  "Particle Explosion", "Surface Tessellation", "Color Diffusion", "Spline Network", "Diamond Tessellation",
  "Molten Chrome", "Refraction Field", "Ethereal Landscape", "Dream Fog", "Electric Stream",
  "Light Volume", "Engineering Surface", "Gravity Well", "Air Cushion Form", "Fiber Bundle",
  "Glass Shards", "Shape Morph", "Seamless Tessellation", "Ocean Floor", "Pulsating Surface",
  "Triangular Tunnel", "Geometric Landscape", "Data Particles", "Magnetic Waves", "Procedural Terrain",
  "Radial Mosaic", "Elastic Surface", "Acrylic Surface", "Twisting Tunnel", "Ribbon Canopy",
  "Magnetic Field", "Coral Formation", "Brushed Metal", "Root System", "Layer Rotation",
  "Fractal Branches", "Folded Satin", "Procedural Framework", "Recursive Mirrors", "Atmospheric Horizon",
  "Side Lighting", "Starfield", "Scalar Field", "Sacred Spiral", "Spider Web",
  "Lattice Grid", "Root Expansion", "Soft Body Structure", "Cliff Formation", "Computational Field",
  "Polished Steel", "Micro Cells", "Thunder Field", "Square Tessellation", "Chromatic Smoke",
  "Floating Mist", "Neon Bloom", "Vapor Stream", "Dynamic Surface", "Terrain Mesh",
  "Ripple Interference", "Scanner Sweep", "Elliptical Flow", "Ink Gradient", "Particle Wave",
  "Rim Glow", "Liquid Waves", "Visual Framework", "Pixel Matrix", "Volumetric Horizon",
  "Electric Waves", "Glass Corridor", "Modular Architecture", "Glass Sheets", "Bezier Curves",
  "Eclipse Halo", "Blob Separation", "Frequency Waves", "Minimal Architecture", "Paint Droplets",
  "Mirror Corridor", "Folded Silk", "Spherical Projection", "Particle Orbit", "Architectural Layers",
  "Pincushion Distortion", "Color Dispersion", "Recursive Surface", "Cube Array", "Topographic Elevation",
  "Layered Glass", "Fractal Tree", "Inflated Structure", "Stretch Grid", "Photon Particles",
  "Jelly Surface", "Impossible Geometry", "Prism Refraction", "Geometric Mosaic", "Icosahedron Array",
  "HDRI Reflection", "Engineering Draft", "Light Matrix", "Dynamic Continuum", "Hyper Dimension",
  "Plateau Surface", "Procedural Continuum", "Oscillating Surface", "Oscilloscope Wave", "Moss Carpet",
  "Generative Framework", "Spiral Wrapping", "Stellar Nursery", "Dynamic Facade", "Noise Terrain",
  "Asteroid Belt", "Fractal Crystal", "Suspended Surface", "Floating Capsules", "Lunar Surface",
  "Plasma Sparks", "Sacred Grid", "Voronoi Mosaic", "Forced Perspective", "Sacred Geometry",
  "Satin Surface", "Chrome Surface", "Particle Halo", "Ethereal Glow", "Barrel Distortion",
  "Orthographic Blocks", "Cinematic Flare", "Snowfall Field", "Curl Noise Flow", "Swarming Motion",
  "Pulse Grid", "Hanging Fabric", "Surreal Landscape", "Floating Tiles", "Mycelium Network",
  "Noise Grid", "Fur Flow", "Pyramid Array", "Fold Morph", "Polar Grid",
  "Temporal Echo", "Procedural Surface", "Holographic Glass", "Chromatic Field", "Mirage Effect",
  "Morph Mesh", "Suspension Structure", "Adaptive Mesh", "Polished Titanium", "Optical Distortion",
  "Sand Ripples", "Offset Panels", "Time Loop", "Magma Surface", "Oxidized Copper",
  "Portal Gateway", "Light Beams", "Cast Shadow Layers", "Galactic Core", "Procedural Composition",
  "Soft Blobs", "Liquid Mercury", "Event Horizon", "Geological Layers", "Golden Spiral",
  "Algorithmic Framework", "Futuristic Architecture", "Procedural Mapping", "Light Waves", "Adaptive Tessellation",
  "Water Distortion", "Galaxy Swirl", "Geodesic Dome", "Silk Waves", "Blob Fusion",
  "Brain Waves", "Recursive Corridor", "Fractal Terrain", "Tendon Network", "Smoke Drift",
  "Meteor Shower", "Network Mesh", "Magnetic Particles", "Infinite Framework", "Processor Core",
  "Embossed Surface", "Procedural Motion", "Vector Noise", "Lightning Network", "Cracked Earth",
  "Implicit Surface", "Luxury Motion", "Rolling Surface", "Layer Fusion", "Anodized Metal",
  "Sculpted Surface", "Wireframe Tunnel", "Landscape Wireframe", "Draped Cloth", "Floating Composition",
  "Marching Cubes", "Hexagon Tunnel", "Implosion Motion", "Ordered Motion", "Lens Flare Field",
  "Structural Mesh", "Atmospheric Layers", "Flexible Framework", "Spatial Composition", "Bridge Framework",
  "Quilted Surface", "Digital Rain", "Celestial Landscape", "Floating Canopy", "Floating Spheres",
  "Planetary Orbit", "Function Plot", "Symmetry Field", "Prism Refractions", "Ribbon Wrapping",
  "Marble Ink", "Mother of Pearl", "Triangle Mesh", "Frosted Acrylic", "Aurora Gradient"
];
