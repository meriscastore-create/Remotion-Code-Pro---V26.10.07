export interface IconStyleCategory {
  name: string;
  styles: string[];
}

export interface BackgroundStyleCategory {
  name: string;
  styles: string[];
}

export const ALL_BACKGROUND_STYLES: string[] = [
  // Motion Background Styles
  "Seamless Motion Wave BG",
  "Kinetic Motion Graphic BG",
  "Liquid Silk Motion BG",
  "Abstract Gradient Mesh BG",
  "Dynamic Particle Field BG",
  "Parametric Flow Ribbon BG",
  "Volumetric Light Rays BG",
  "Looping Geometric Motion BG",
  "Prismatic Glass Refraction BG",
  "Organic Fluid Blob BG",
  "Neomorphic Wave Depth BG",
  "Aurora Bokeh Light BG",
  "Cosmic Nebula Flow BG",
  "Glowing Cyber Network BG",

  // Illustration Background Styles
  "Flat Vector Illustration BG",
  "Isometric Landscape Illustration BG",
  "Paper Cut Layered Illustration BG",
  "Low-Poly Polygon Illustration BG",
  "Minimalist Nature Illustration BG",
  "Futuristic Cyber City Illustration BG",
  "Kawaii Pastel Vector Illustration BG",
  "Hand-Drawn Watercolor Illustration BG",
  "Retro Synthwave Sunset Illustration BG",
  "Abstract Geometric Pattern Illustration BG",
  "Botanical Line-Art Illustration BG",
  "Celestial Galaxy Illustration BG",
  "Architectural Structural Illustration BG",
  "Claymation 3D Illustration BG",

  // 3D & CGI Motion Backgrounds
  "Ultra-Realistic 3D CGI Motion BG",
  "Pearlescent Satin 3D Motion BG",
  "Reflective Chrome Liquid 3D BG",
  "Glassmorphism Depth 3D Motion BG",
  "Luxurious Gold Vein Marble 3D BG",
  "Voxel Digital City 3D Motion BG",
  "Floating Monolith 3D Motion BG",
  "Low-Poly Crystal Cave 3D Motion BG",

  // Abstract & Tech Backgrounds
  "Topographic Contour Flow BG",
  "Sci-Fi Circuit Grid Motion BG",
  "Quantum Wave Interference BG",
  "Voronoi Cell Network BG",
  "Hexagonal Matrix Glow BG",
  "Radial Kinetic Energy BG",
  "Infinity Tunnel Motion BG"
];

export const BACKGROUND_STYLE_CATEGORIES: BackgroundStyleCategory[] = [
  {
    name: "Motion BG",
    styles: [
      "Seamless Motion Wave BG",
      "Kinetic Motion Graphic BG",
      "Liquid Silk Motion BG",
      "Abstract Gradient Mesh BG",
      "Dynamic Particle Field BG",
      "Parametric Flow Ribbon BG",
      "Volumetric Light Rays BG",
      "Looping Geometric Motion BG",
      "Prismatic Glass Refraction BG",
      "Organic Fluid Blob BG",
      "Neomorphic Wave Depth BG",
      "Aurora Bokeh Light BG",
      "Cosmic Nebula Flow BG",
      "Glowing Cyber Network BG"
    ]
  },
  {
    name: "Illustration BG",
    styles: [
      "Flat Vector Illustration BG",
      "Isometric Landscape Illustration BG",
      "Paper Cut Layered Illustration BG",
      "Low-Poly Polygon Illustration BG",
      "Minimalist Nature Illustration BG",
      "Futuristic Cyber City Illustration BG",
      "Kawaii Pastel Vector Illustration BG",
      "Hand-Drawn Watercolor Illustration BG",
      "Retro Synthwave Sunset Illustration BG",
      "Abstract Geometric Pattern Illustration BG",
      "Botanical Line-Art Illustration BG",
      "Celestial Galaxy Illustration BG",
      "Architectural Structural Illustration BG",
      "Claymation 3D Illustration BG"
    ]
  },
  {
    name: "3D & CGI BG",
    styles: [
      "Ultra-Realistic 3D CGI Motion BG",
      "Pearlescent Satin 3D Motion BG",
      "Reflective Chrome Liquid 3D BG",
      "Glassmorphism Depth 3D Motion BG",
      "Luxurious Gold Vein Marble 3D BG",
      "Voxel Digital City 3D Motion BG",
      "Floating Monolith 3D Motion BG",
      "Low-Poly Crystal Cave 3D Motion BG"
    ]
  },
  {
    name: "Abstract & Tech BG",
    styles: [
      "Topographic Contour Flow BG",
      "Sci-Fi Circuit Grid Motion BG",
      "Quantum Wave Interference BG",
      "Voronoi Cell Network BG",
      "Hexagonal Matrix Glow BG",
      "Radial Kinetic Energy BG",
      "Infinity Tunnel Motion BG"
    ]
  }
];

export const ALL_ICON_STYLES: string[] = [
  "Flat Icon",
  "Filled Icon",
  "Outline Icon",
  "Line Icon",
  "Monoline Icon",
  "Duotone Icon",
  "Two-Tone Icon",
  "Multicolor Icon",
  "Gradient Icon",
  "Glyph Icon",
  "Solid Icon",
  "Semi-Filled Icon",
  "Bold Icon",
  "Thin Line Icon",
  "Rounded Icon",
  "Sharp Edge Icon",
  "Geometric Icon",
  "Minimalist Icon",
  "Modern UI Icon",
  "Material Style Icon",
  "Fluent Style Icon",
  "Vector Cute",
  "Kawaii Vector",
  "Cartoon Vector",
  "Vector Cute Icon",
  "Kawaii Vector Icon",
  "Cartoon Vector Icon",
  "Glassmorphism Icon",
  "Neumorphism Icon",
  "Clay Icon",
  "Soft 3D Icon",
  "Isometric Icon",
  "Axonometric Icon",
  "Pixel Icon",
  "Retro Icon",
  "Vintage Icon",
  "Hand Drawn Icon",
  "Sketch Icon",
  "Doodle Icon",
  "Cartoon Icon",
  "Cute Icon",
  "Kawaii Icon",
  "Emoji Style Icon",
  "Sticker Style Icon",
  "Paper Cut Icon",
  "Origami Icon",
  "Low Poly Icon",
  "Wireframe Icon",
  "Holographic Icon",
  "Metallic Icon",
  "Chrome Icon",
  "Neon Glow Icon",
  "Cyberpunk Icon",
  "Futuristic Icon",
  "Sci-Fi Icon",
  "Crystal Icon",
  "Glass Icon",
  "Liquid Icon",
  "Gel Icon",
  "Bubble Icon",
  "Plastic Icon",
  "Wooden Icon",
  "Stone Icon",
  "Marble Icon",
  "Fabric Icon",
  "Felt Icon",
  "Leather Icon",
  "Claymation Icon",
  "Pencil Icon",
  "Chalk Icon",
  "Watercolor Icon",
  "Ink Brush Icon",
  "Paint Stroke Icon",
  "Cutout Icon",
  "Mosaic Icon",
  "Abstract Icon",
  "Monochrome Icon",
  "High Contrast Icon",
  "Soft Pastel Icon",
  "Vibrant Color Icon",
  "Luxury Icon",
  "Premium UI Icon",
  "Corporate Icon",
  "Infographic Icon",
  "Dashboard Icon",
  "Broadcast Icon",
  "Lottie Style Icon",
  "Motion Graphics Icon",
  "Micro Interaction Icon",
  "Animated SVG Icon",
  "Kinetic Icon",
  "Morphing Icon",
  "Elastic Icon",
  "Bouncy Icon",
  "Floating Icon",
  "Floating Glass Icon",
  "Hologram Icon",
  "HUD Icon",
  "Tech UI Icon",
  "Blueprint Icon",
  "Wire Icon",
  "CNC Line Icon",
  "Engraved Icon",
  "Embossed Icon",
  "Debossed Icon",
  "Extruded 3D Icon",
  "Photorealistic 3D Icon",
  "CGI Icon",
  "Toon 3D Icon",
  "Voxel Icon",
  "Sculpted Icon",
  "Beveled Icon",
  "Soft Shadow Icon",
  "Long Shadow Icon",
  "Ambient Glow Icon",
  "Frosted Glass Icon",
  "Acrylic Icon",
  "Transparent Icon",
  "Semi-Transparent Icon",
  "Mesh Gradient Icon",
  "Organic Shape Icon",
  "Blob Style Icon",
  "Ribbon Style Icon",
  "Ribbon Line Icon",
  "Ribbon Filled Icon",
  "Ribbon Outline Icon",
  "Badge Icon",
  "Emblem Icon",
  "Crest Icon",
  "Shield Icon",
  "Monogram Icon",
  "Luxury Monoline Icon",
  "Premium Outline Icon",
  "Premium Filled Icon",
  "Enterprise UI Icon",
  "Editorial Icon",
  "Editorial Line Icon",
  "Editorial Filled Icon"
];

export const ICON_STYLE_CATEGORIES: IconStyleCategory[] = [
  {
    name: "2D & Flat UI",
    styles: [
      "Flat Icon", "Filled Icon", "Outline Icon", "Line Icon", "Monoline Icon", 
      "Duotone Icon", "Two-Tone Icon", "Multicolor Icon", "Gradient Icon", "Glyph Icon", 
      "Solid Icon", "Semi-Filled Icon", "Bold Icon", "Thin Line Icon", "Rounded Icon", 
      "Sharp Edge Icon", "Geometric Icon", "Minimalist Icon", "Modern UI Icon", 
      "Material Style Icon", "Fluent Style Icon", "Vector Cute", "Kawaii Vector", "Cartoon Vector",
      "Vector Cute Icon", "Kawaii Vector Icon", "Cartoon Vector Icon"
    ]
  },
  {
    name: "3D & Volume",
    styles: [
      "Clay Icon", "Soft 3D Icon", "Isometric Icon", "Axonometric Icon", "Extruded 3D Icon", 
      "Photorealistic 3D Icon", "CGI Icon", "Toon 3D Icon", "Voxel Icon", "Sculpted Icon", 
      "Beveled Icon", "Low Poly Icon", "Paper Cut Icon", "Origami Icon"
    ]
  },
  {
    name: "Glass, Materials & Textures",
    styles: [
      "Glassmorphism Icon", "Neumorphism Icon", "Crystal Icon", "Glass Icon", "Liquid Icon", 
      "Gel Icon", "Bubble Icon", "Plastic Icon", "Wooden Icon", "Stone Icon", "Marble Icon", 
      "Fabric Icon", "Felt Icon", "Leather Icon", "Frosted Glass Icon", "Acrylic Icon", 
      "Transparent Icon", "Semi-Transparent Icon", "Mesh Gradient Icon"
    ]
  },
  {
    name: "Futuristic & Glow",
    styles: [
      "Holographic Icon", "Metallic Icon", "Chrome Icon", "Neon Glow Icon", "Cyberpunk Icon", 
      "Futuristic Icon", "Sci-Fi Icon", "Wireframe Icon", "Floating Glass Icon", "Hologram Icon", 
      "HUD Icon", "Tech UI Icon", "Blueprint Icon", "Wire Icon", "CNC Line Icon", "Ambient Glow Icon"
    ]
  },
  {
    name: "Handcrafted & Artistic",
    styles: [
      "Pixel Icon", "Retro Icon", "Vintage Icon", "Hand Drawn Icon", "Sketch Icon", 
      "Doodle Icon", "Cartoon Icon", "Cute Icon", "Kawaii Icon", "Emoji Style Icon", 
      "Sticker Style Icon", "Claymation Icon", "Pencil Icon", "Chalk Icon", "Watercolor Icon", 
      "Ink Brush Icon", "Paint Stroke Icon", "Cutout Icon", "Mosaic Icon"
    ]
  },
  {
    name: "Motion & Kinetik",
    styles: [
      "Lottie Style Icon", "Motion Graphics Icon", "Micro Interaction Icon", "Animated SVG Icon", 
      "Kinetic Icon", "Morphing Icon", "Elastic Icon", "Bouncy Icon", "Floating Icon", 
      "Organic Shape Icon", "Blob Style Icon", "Ribbon Style Icon", "Ribbon Line Icon", 
      "Ribbon Filled Icon", "Ribbon Outline Icon"
    ]
  },
  {
    name: "Luxury & Enterprise Badges",
    styles: [
      "Badge Icon", "Emblem Icon", "Crest Icon", "Shield Icon", "Monogram Icon", 
      "Luxury Monoline Icon", "Premium Outline Icon", "Premium Filled Icon", "Enterprise UI Icon", 
      "Editorial Icon", "Editorial Line Icon", "Editorial Filled Icon", "Abstract Icon", 
      "Monochrome Icon", "High Contrast Icon", "Soft Pastel Icon", "Vibrant Color Icon", 
      "Luxury Icon", "Premium UI Icon", "Corporate Icon", "Infographic Icon", "Dashboard Icon", 
      "Broadcast Icon", "Engraved Icon", "Embossed Icon", "Debossed Icon", "Soft Shadow Icon", 
      "Long Shadow Icon"
    ]
  }
];

export function buildIconPrompt(concept: string, style: string, subConceptIndex?: number, bgOverride?: string): { prompt: string; title: string } {
  const cleanConcept = concept.trim() || "Vector Icon";
  const title = `${cleanConcept}_${style.replace(/\s+/g, '_')}_icon`.toLowerCase();

  const noShadowRule = (bgOverride === 'greenscreen' || bgOverride === 'white' || bgOverride === 'alpha')
    ? `\n\n4. ATURAN KETAT GREENSCREEN / WHITESCREEN / ALPHA CHANNEL (ZERO SHADOW MANDATE):
   - KARENA LATAR BELAKANG TERPILIH ADALAH ${bgOverride.toUpperCase()} (CHROMA KEY / ALPHA MATTE):
   - DILARANG KERAS (100% STRICTLY FORBIDDEN) MENAMBAHKAN SHADOW, DROP SHADOW, CONTACT SHADOW, LONG SHADOW, SOFT SHADOW, ATAU GLOW BLUR SHADOW PADA IKON ATAU ELEMEN VISUAL APAPUN!
   - Seluruh objek ikon dan elemen pendukung HARUS MURNI TANPA BAYANGAN (clean edge / crisp vector boundary) agar mudah dipotong dan diisolasi tanpa ada cemaran bayangan/spill gelap pada latar belakang.${bgOverride === 'alpha' ? '\n   - LATAR BELAKANG WAJIB 100% TRANSPARAN (transparent / rgba(0,0,0,0)).' : ''}`
    : '';

  const prompt = `AUTO-GENERATE VECTOR ANIMATED ICON:
Subjek Utama Icon: "${cleanConcept}"
Style Icon yang Dipilih: "${style}"

PETUNJUK KETAT KODE MANDATORI (WAJIB MEMENUHI DUA ATURAN UTAMA):

0. ATURAN MUTLAK SUBJEK UTAMA & SINGLE FOCAL ICON (PRINSIP MANDATORI UTAMA):
   - WAJIB MEMBUAT 1 SINGLE FOCAL ICON HERO: Ikon yang dihasilkan HARUS FOKUS PADA 1 IKON UTAMA (Single Hero Icon) yang menjadi pusat perhatian canvas. DILARANG KERAS membuat grid banyak icon, lembaran stiker, atau menumpuk berbagai jenis objek yang membingungkan.
   - SUBJEK DAN BENTUK IKON UTAMA HARUS 100% PERSIS DAN SESUAI KONSEP: "${cleanConcept}".
     * Misal konsep "Financial/Keuangan", buatlah 1 IKON HERO UTAMA yang sangat presisi (seperti 1 Ikon Koin Emas 3D yang berputar smooth, ATAU 1 Ikon Kartu Kredit Bouncy dengan efek kilau gloss, ATAU 1 Ikon Dompet dengan koin melompat halus, ATAU 1 Ikon Brankas Vault dengan pendaran aksen).
     * DILARANG KERAS MENGGANTI ATAU MENGUBAH OBJEK/SIMBOL IKON MENJADI BENTUK LAIN MAUPUN MENAMBAHKAN ELEMEN RANDOM YANG TIDAK RELEVAN DENGAN KONSEP!
   - Nama style yang dipilih ("${style}") HANYA BERFUNGSI SEBAGAI GAYA VISUAL / RENDERING / TEXTURE / EFEK, BUKAN MENGUBAH OBJEK UTAMA.
     * Contoh: Jika Konsep = "Kucing" (Cat) dan Style = "Shield Icon" atau "Paper Cut Icon" atau "Dashboard Icon", maka objek visual utama WAJIB BERBENTUK KUCING, BUKAN PERISAI ATAU DASHBOARD POLOS. Perisai/dashboard/clay/glass HANYA MERUPAKAN ESTETIKA/TEKNIK VISUAL IKON KUCING TERSEBUT.
   - HANYA gunakan gaya & estetika visual (tekstur, warna, shading, stroke, gradien, atau style khas) dari style "${style}". Objek/simbol utama DILARANG BERUBAH DARI "${cleanConcept}".

1. TATA LETAK, GEOMETRI PRESISI & FRAME CONTAINER 16:9 (60% FRAME SIZE):
   - GEOMETRI & BENTUK KRITIKAL HARUS SEMPURNA: Path SVG vektor HARUS memiliki presisi geometris tinggi, simetris dan proporsional sempurna (misal: lingkaran koin bulat presisi, sudut kartu membulat konsisten, lekukan simetris) TANPA CACAT ATAU TERDISTORSI.
   - POSISI TEPAT DI TENGAH CANVAS (CENTERED ACCURACY): Ikon vektor utama HARUS berada TEPAT DI TENGAH CANVAS (centered at X=1920, Y=1080).
   - ANCHOR POINT & TRANSFORM ORIGIN TERKUNCI PRESISI: Gunakan transform-origin: 1920px 1080px atau "center center" pada grup elemen dianimasikan agar rotasi/scaling/flip/tilt tidak menggeser posisi ikon dari titik tengah canvas.
   - Ukuran total bounding box ikon WAJIB TEPAT 60% DARI UKURAN FRAME (sekitar 2304px x 1296px di pusat frame).
   - DILARANG KERAS KELUAR FRAME (STRICT NO OUT-OF-BOUNDS ON FADE-IN & ENTRY): Saat Fade-In (Entry) maupun Continuous Motion, ikon/partikel/aura DILARANG KERAS meluber atau keluar sampai ke luar frame canvas (3840x2160 bounding box). Capping scale entry max 1.02 (misal scale 0.65 -> 1.00, Y-offset entry max +/- 60px). Gunakan overflow: hidden pada container 16:9.
   - Semua elemen vektor ikon HARUS terkunci secara relatif terhadap titik pusat 16:9 tersebut tanpa bergeser keluar frame.

2. ANIMASI LOTTIE-STYLE ULTRA-SMOOTH, ADAPTIF DURASI & RITME HARMONIS (KUALITAS LOTTIEFILES 60FPS):
   - SINKRONISASI DURASI MURNI & PRESISI (FADE-IN TO FADE-OUT DURATION ADAPTATIVE):
     * Seluruh tahapan animasi (Entry Fade-In -> Continuous Motion -> Exit Fade-Out) WAJIB dihitung secara relatif berdasarkan persentase progress = frame / DURATION (atau useVideoConfig().durationInFrames), DILARANG GUNAKAN NOMOR FRAME KAKU.
     * **Efek Gerakan Pas Sesuai Durasi (No Awkward / Strange Motion)**: Kecepatan dan frekuensi mikro-animasi (floating sinewave, tilt 3D, rotation, glare sweep) HARUS disesuaikan secara matematis dengan total durasi yang ditentukan. Gunakan siklus gelombang harmonik murni (Math.sin(progress * Math.PI * 2 * N)) dengan frekuensi integer N agar ritme animasi tetap tenang, mulus, dan tidak tercipta gerakan yang terlalu cepat, tersendat, atau aneh.
   - WAJIB MENGADOPSI STANDAR ANIMASI VEKTOR LOTTIE / LOTTIEFILES:
     * **Layer Separation (Pemisahan Layer Vektor)**: Pisahkan elemen vektor ke dalam grup terpisah (contoh: "<g id='background-aura'>", "<g id='shadow'>", "<g id='main-body'>", "<g id='inner-details'>", "<g id='accent-particles'>").
     * **Staggered Keyframing (Timing Bertingkat)**: Setiap layer masuk secara bertahap (delay 0.03s - 0.08s antar layer), tidak kaku bersamaan.
     * **Spring & Elastic Easing (Physics Motion)**: Gunakan kurva easing elastic/spring overshoot (seperti "cubic-bezier(0.34, 1.56, 0.64, 1)" atau interpolasi spring Remotion) untuk gerakan pop-in & bounce yang sangat natural.
     * **Secondary Micro-Interactions**: Tambahkan mikro-animasi pemanis khas LottieFiles (misal: kilau sinar diagonal / glare sheen sweep, letupan partikel bintang/koin mungil yang membal halus, pendaran aura pulse, atau stroke dash-array draw path).
   - SESUAIKAN KARAKTER ANIMASI DENGAN IKON "${cleanConcept}":
     * **Ikon Koin / Emblem / Badge / Globe**: Lottie 3D Y-Axis Flip & Spring Reveal (0-15%) + continuous 360-degree rotation / light sheen reflection sweep + floating sinewave (15-85%).
     * **Ikon Kartu Kredit / Tiket / Card UI**: Lottie Elastic Pop-In dengan Overshoot (0-15%) + continuous 3D hovering tilt dengan diagonal glossy shimmer sweep (15-85%).
     * **Ikon Dompet / Vault / Gift Box / Shopping Bag**: Lottie Spring Scale-Up + micro-action (penutup/brankas sedikit terbuka dengan burst koin/partikel bintang membal) (15-85%).
     * **Ikon Line / Neon / Glyph / Minimalist**: Lottie Stroke Write/Draw Path animation + glowing respiration pulse (15-85%).
   - ALUR SIKLUS LOTTIE TERPRESISE (ENTRY → CONTINUOUS → EXIT → SEAMLESS LOOP):
     * ENTRY (Progress 0.00 -> 0.15): Smooth Lottie Fade-In + Elastic Spring Pop / 3D Flip / Stroke Draw (Opacity 0 -> 1) persis pada 15% awal durasi.
     * CONTINUOUS (Progress 0.15 -> 0.85): Micro-motion continuous 60fps feel yang ritmis dan mengalir tenang sesuai durasi (smooth floating floatY +/- 15px, micro-rotation 2-5 deg, particle float, glare sweep, pulse glow).
     * EXIT (Progress 0.85 -> 1.00): Smooth Fade-Out & Scale-Down kembali persis ke kondisi awal (opacity 1 -> 0, scale 1.0 -> 0.85) persis pada 15% akhir durasi untuk SEAMLESS LOOP tanpa patahan ( progress=0.0 dan progress=1.0 WAJIB 100% IDENTIK ).

3. ESTETIKA VISUAL & STANDAR KUALITAS ASSET MARKETPLACE (CLEAN & PERFECT VECTOR):
   - WAJIB KUALITAS ASSET MARKETPLACE (LOTTIEFILES / ICONSCOUT / FLATICON STANDARD):
     * **Pristine Clean Geometry**: Path SVG vektor WAJIB dibentuk dengan presisi geometris tinggi, kurva sangat mulus, simetris, dan bentuk bulat/persegi/sudut yang proporsional sempurna tanpa cacat/patahan.
     * **Kombinasi Warna & Kontras Tinggi**: Gunakan skema warna profesional yang segar, kontras tinggi, dengan pen Penfill/Shading/Highlight yang sangat tegas (misal: kantung uang hijau murni dengan simbol '$' emas/putih yang sangat jelas, celengan babi pink yang imut dan presisi, tumpukan koin emas dengan bevel kilau yang rapi).
     * **ZERO CLUTTER / BEBAS NOISE VISUAL**: DILARANG KERAS menambahkan garis coretan acak, partikel berakan tak berguna, atau efek buram/pendaran berlebihan yang mengotori kebersihan wujud ikon. Seluruh elemen HARUS bersih, rapi, dan memiliki fungsi visual langsung.
     * **DILARANG MENAMBAHKAN MUKA / FACIAL FEATURES (NO FACES ON CARTOON/CUTE/KAWAII)**: DILARANG KERAS MENAMBAHKAN WAJAH, MATA, MULUT, ATAU EKSPRESI MUKA PADA OBJEK/IKON DENGAN STYLE APAPUN (TERMASUK STYLE CARTOON, CUTE, KAWAII, CLAY, 3D, DLL). Objek ikon (seperti celengan babi, kantung uang, dompet, koin, dll) HARUS TETAP BEBAS DARI WAJAH/MATA/MULUT, murni berfokus pada bentuk produk/simbol vektor yang rapi, profesional, dan bersih tanpa personifikasi bermuka.
     * **DILARANG BINGKAI LINGKARAN MENGGANGGU (NO UNWANTED BACKDROP CIRCLES / RINGS)**: DILARANG KERAS membingkai atau melapisi ikon dengan piringan/lingkaran latar belakang (backdrop circle disc, circular frame plate, outer ring container, aura circle) yang mengganggu, kecuali jika subjek utama ikon itu sendiri memang berupa lingkaran murni (seperti koin emas atau globe). Subjek ikon HARUS berdiri sendiri secara murni dan bersih tanpa piringan lingkaran pembungkus.
     * **Kejelasan Simbolis Instan**: Bentuk dan fungsi ikon HARUS langsung teridentifikasi secara instan dari kejauhan.
   - Terapkan warna, shading, gradien, atau bayangan yang mencerminkan gaya "${style}".
   - Latar belakang transparan atau dark neutral minimalis (#04050a atau sesuai override background).${noShadowRule}

4. DILARANG KERAS MENAMBAHKAN HUD OVERLAY / STATS METRICS (ABSOLUTELY NO HUD OVERLAY / NO DEBUG METRICS):
   - DILARANG KERAS MENAMBAHKAN HUD, OVERLAY STATISTIK, FPS COUNTER, FRAME TIME, RENDER TIME, GPU USAGE, CPU USAGE, MEMORY USAGE, VRAM USAGE, PERFORMANCE GRAPH, KEYFRAME INDICATOR, TIMELINE, PLAYHEAD, PROGRESS BAR, FRAME COUNTER, ANIMATION PROGRESS, PLAYBACK SPEED, BINGKAI VIEWFINDER CORNERS, ATAU CONTROLS OVERLAY APAPUN PADA HASIL KODE TSX MAUPUN PREVIEW HTML!
   - Hasil rendering HARUS 100% MURNI KARYA VEKTOR IKON TERPUSAT DI TENGAH CANVAS TANPA ELEMEN OVERLAY TEKNIS APAPUN.

5. FRAME CANVAS 16:9 UTUH TANPA TERPOTONG (NO CROPPED FRAME ON GREENSCREEN / BLACK / WHITE / DEFAULT):
   - Canvas 3840x2160 wajib utuh dan seluruh ikon terikat rapi di tengah canvas (AbsoluteFill, width 100%, height 100%, overflow hidden, position relative/absolute).
   - DILARANG KERAS tepi atau ujung frame terpotong ketika memilih Warna Latar Belakang Greenscreen (#00ff00), Hitam (#000000), atau Putih (#ffffff).

Outputkan kode Remotion TSX dan Preview HTML murni yang ultra-kompleks, valid, dan dapat dirender langsung.`;

  return { prompt, title };
}

// Sub-concept generator for Bulk Icon Mode (10 to 50 icons)
const COMMON_THEME_SETS: Record<string, string[]> = {
  "e commerce": [
    "Shopping Bag", "Credit Card", "Shopping Cart", "Delivery Truck", "Discount Tag",
    "Gift Box", "Digital Wallet", "Store Front", "Customer Rating Star", "Barcode Scanner",
    "Security Shield", "Coin Stack", "Receipt Invoice", "Customer Support Headset", "Flash Sale Lightning",
    "Wishlist Heart", "Promo Coupon", "Cash Register", "Percentage Badge", "Return Package Box",
    "Price Tag", "Loyalty Card", "Express Delivery", "Online Checkout", "Product Box",
    "Shopping Basket", "Sale Megaphone", "Mobile Shopping", "Payment Terminal", "Gift Card",
    "Free Shipping Badge", "Order Tracking Pin", "Qr Code Payment", "Verified Seller Badge", "Inventory Warehouse",
    "Shopping Bell Notification", "Wishlist Ribbon", "Currency Exchange", "Product Search", "Order Success Check"
  ],
  fintech: [
    "Digital Wallet", "Credit Card", "Coin Stack", "Growth Chart Arrow", "Bank Building",
    "Security Vault", "Money Transfer", "Cryptocurrency Coin", "Piggy Bank Savings", "Tax Document",
    "Shield Protection", "Investment Plant", "ATM Machine", "Financial Analytics", "Stock Market Bull",
    "Mobile Banking", "Contract Handshake", "Currency Exchange", "Profit Bag", "Loss Chart",
    "Invoice Receipt", "Smart Contract", "Safe Lock", "QR Code Scanner", "Financial Goal Flag",
    "Credit Score Gauge", "Dividend Star", "Budget Wallet", "Global Money", "Payment Terminal"
  ],
  technology: [
    "AI Brain Core", "Cloud Server", "Cyber Security Shield", "Quantum Processor", "Code Terminal",
    "Robot Automation", "Database Stack", "Satellite Antenna", "Microchip Circuit", "Virtual Reality Glasses",
    "5G Signal Tower", "Blockchain Node", "Smart Watch", "Drone Propeller", "Bio Scan Fingerprint",
    "Augmented Reality Cube", "Data Pipeline", "Smart Home Hub", "API Connection", "Network Nodes",
    "Optic Fiber Cable", "SaaS Cloud", "Bot Chat Bubble", "Battery Cell", "High Speed Fiber"
  ],
  health: [
    "Heartbeat Pulse", "Medical Stethoscope", "Pill Capsule", "DNA Double Helix", "First Aid Kit",
    "Hospital Building", "Medical Syringe", "Tooth Protection", "Eye Inspection", "Fitness Dumbbell",
    "Healthy Apple", "Brain Synapse", "Therpometer Temperature", "Medical Cross Shield", "Ambulance Vehicle",
    "Water Hydration Drop", "Sleep Moon Shield", "Virus Protection", "Doctor Avatar", "Microscope Lens",
    "Bandage Patch", "Lab Flask Test", "Medical Report Clipboard", "Heart Protection Hands", "Medical Scanner"
  ],
  education: [
    "Graduation Cap", "Open Book", "Lightbulb Idea", "Pencil Writing", "School Bus",
    "Trophy Award", "Certificate Scroll", "Atom Science", "Compass Geometry", "Globe World",
    "Blackboard Chalk", "Calculator Math", "Backpack Bag", "Microscope Lab", "Online Class Laptop",
    "Library Bookshelf", "Hourglass Timer", "Exam Clipboard", "Medal Ribbon", "Brain Learning"
  ],
  security: [
    "Security Shield", "Padlock Closed", "Key Access", "Fingerprint Scan", "Eye Iris Scan",
    "Cyber Defense Fire", "Server Vault", "User Lock", "VPN Tunnel", "Encryption Key",
    "Passcode Pin", "Security Camera CCTV", "Alarm Bell", "Verified Badge", "Shield Check Mark"
  ],
  crypto: [
    "Bitcoin Gold Coin", "Ethereum Crystal", "Blockchain Cube", "Crypto Wallet", "Mining Rig",
    "Decentralized Network", "Smart Contract Scroll", "Bull Market Chart", "Cold Storage Ledger", "Token Swap Arrow",
    "NFT Digital Badge", "Peer To Peer Nodes", "Gas Fee Fuel", "Staking Reward Vault", "Crypto Exchange Shield"
  ]
};

export function generateBulkIconConcepts(mainTopic: string, count: number): string[] {
  const normalizedTopic = mainTopic.toLowerCase().trim();
  const concepts: string[] = [];

  // Check if topic matches known theme set
  for (const [key, list] of Object.entries(COMMON_THEME_SETS)) {
    if (normalizedTopic.includes(key)) {
      while (concepts.length < count) {
        for (const item of list) {
          if (concepts.length >= count) break;
          const suffix = concepts.length >= list.length ? ` ${Math.floor(concepts.length / list.length) + 1}` : '';
          concepts.push(`${item}${suffix}`);
        }
      }
      return concepts.slice(0, count);
    }
  }

  // Dynamic fallback for any single word or phrase prompt (e.g. "rocket", "apple", "cyberpunk", "restaurant", "space", "nature")
  const capitalizedTopic = mainTopic ? mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1) : "Concept";
  
  const MODIFIERS = [
    "Core", "Main Symbol", "Outline Variant", "Dynamic Action", "Analytics Chart",
    "Mobile Interface", "Security Shield", "Network Connection", "Cloud Service", "User Profile",
    "Growth Arrow", "Setting Gear", "Notification Bell", "Storage Vault", "Check Verified",
    "Favorite Star", "Search Magnifier", "Speed Fast", "Premium Badge", "Power Button",
    "Sync Refresh", "Lock Secure", "Global World", "Smart Hub", "Digital Badge",
    "Pro Version", "Compact Mini", "Expanded View", "Interactive Touch", "Future Version",
    "Creative Spark", "Energy Pulse", "Layered View", "Structure Grid", "Flow Pathway",
    "Storage Box", "Detail Spec", "Center Target", "Light Accent", "Solid Symbol",
    "Dynamic Flow", "Signal Tower", "Access Key", "Precision Indicator", "Master Emblem",
    "Primary Node", "Active State", "Efficiency Gauge", "Infinity Loop", "Final Success"
  ];

  for (let i = 0; i < count; i++) {
    const mod = MODIFIERS[i % MODIFIERS.length];
    const itemNum = i >= MODIFIERS.length ? ` #${Math.floor(i / MODIFIERS.length) + 1}` : '';
    concepts.push(`${capitalizedTopic} ${mod}${itemNum}`);
  }

  return concepts.slice(0, count);
}
