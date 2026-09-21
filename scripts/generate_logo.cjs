const fs = require('fs');
const path = require('path');

// 1. Stacked Badge Logo (Matching user's image exactly)
const createVerticalLogoSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 280" width="700" height="280">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&amp;display=swap');
      .brand-title {
        font-family: 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 900;
        fill: #FFFFFF;
        font-size: 38px;
        letter-spacing: 2.5px;
      }
    </style>
  </defs>

  <!-- Deep Blue Background -->
  <rect width="700" height="280" rx="16" fill="#0B2240"/>

  <!-- Logo Emblem Mark -->
  <g transform="translate(275, 20)">
    <!-- White M -->
    <path d="M 10 120 L 10 20 L 50 80 L 90 20 L 130 20 L 130 120 L 105 120 L 105 52 L 75 96 L 52 96 L 38 72 L 38 120 Z" fill="#FFFFFF"/>
    
    <!-- Dark Gable Shadow -->
    <path d="M 42 85 L 86 42 L 128 85 L 128 120 L 42 120 Z" fill="#0B2240"/>
    
    <!-- Gold Main Roof -->
    <path d="M 80 30 L 132 76 L 132 120 L 105 120 L 105 92 L 80 70 L 58 92 L 46 80 Z" fill="#C88E28"/>
    
    <!-- Gold Roof Ridge / Overhang Lines -->
    <path d="M 32 88 L 80 26 L 136 76" fill="none" stroke="#D49B28" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 44 84 L 80 48 L 116 84" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Window -->
    <rect x="74" y="72" width="13" height="16" rx="1.5" fill="#FFFFFF"/>
    <line x1="80.5" y1="72" x2="80.5" y2="88" stroke="#0B2240" stroke-width="2"/>
    <line x1="74" y1="80" x2="87" y2="80" stroke="#0B2240" stroke-width="2"/>
  </g>

  <!-- Brand Title Text -->
  <text x="350" y="210" text-anchor="middle" class="brand-title">MERIT REAL SOLUTIONS</text>
</svg>
`;

// 2. Horizontal Header Logo
const createHeaderLogoSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 140" width="660" height="140">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&amp;display=swap');
      .brand-title {
        font-family: 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 900;
        fill: #FFFFFF;
        font-size: 31px;
        letter-spacing: 1.5px;
      }
    </style>
  </defs>

  <!-- Deep Blue Background -->
  <rect width="660" height="140" rx="12" fill="#0B2240"/>

  <!-- Logo Emblem Mark -->
  <g transform="translate(20, 12)">
    <!-- White M -->
    <path d="M 10 110 L 10 18 L 48 74 L 86 18 L 122 18 L 122 110 L 98 110 L 98 48 L 70 90 L 50 90 L 36 68 L 36 110 Z" fill="#FFFFFF"/>
    
    <!-- Dark Gable Shadow -->
    <path d="M 40 78 L 80 38 L 120 78 L 120 110 L 40 110 Z" fill="#0B2240"/>
    
    <!-- Gold Main Roof -->
    <path d="M 75 28 L 124 72 L 124 110 L 98 110 L 98 84 L 75 64 L 54 84 L 42 74 Z" fill="#C88E28"/>
    
    <!-- Gold Roof Ridge / Eave Overhang -->
    <path d="M 30 82 L 75 24 L 128 72" fill="none" stroke="#D49B28" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 42 78 L 75 46 L 110 78" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Window -->
    <rect x="70" y="66" width="12" height="15" rx="1.5" fill="#FFFFFF"/>
    <line x1="76" y1="66" x2="76" y2="81" stroke="#0B2240" stroke-width="2"/>
    <line x1="70" y1="73.5" x2="82" y2="73.5" stroke="#0B2240" stroke-width="2"/>
  </g>

  <!-- Brand Name Text -->
  <text x="160" y="82" class="brand-title">MERIT REAL SOLUTIONS</text>
</svg>
`;

// 3. Full Banner SVG (With 4 Pillars: TRUST, TRANSPARENCY, VALUE, GROWTH)
const createFullBannerSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" width="1000" height="560">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&amp;display=swap');
      .brand-title {
        font-family: 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 900;
        fill: #FFFFFF;
        font-size: 50px;
        letter-spacing: 3.5px;
      }
      .pillar-title {
        font-family: 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 800;
        fill: #FFFFFF;
        font-size: 18px;
        letter-spacing: 2px;
      }
    </style>
  </defs>

  <!-- Deep Blue Background -->
  <rect width="1000" height="560" rx="16" fill="#0B2240"/>

  <!-- Logo Mark (Centered Top) -->
  <g transform="translate(415, 35)">
    <!-- White M -->
    <path d="M 15 130 L 15 20 L 60 85 L 105 20 L 150 20 L 150 130 L 118 130 L 118 58 L 85 108 L 60 108 L 46 86 L 46 130 Z" fill="#FFFFFF"/>
    
    <!-- Dark Gable Shadow -->
    <path d="M 50 96 L 102 48 L 152 96 L 152 130 L 50 130 Z" fill="#0B2240"/>
    
    <!-- Gold Main Roof -->
    <path d="M 95 34 L 155 90 L 155 130 L 122 130 L 122 104 L 95 78 L 68 104 L 52 90 Z" fill="#C88E28"/>
    
    <!-- Gold Roof Eaves -->
    <path d="M 38 102 L 95 28 L 162 88" fill="none" stroke="#D49B28" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 52 98 L 95 56 L 138 98" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Window -->
    <rect x="88" y="82" width="15" height="19" rx="2" fill="#FFFFFF"/>
    <line x1="95.5" y1="82" x2="95.5" y2="101" stroke="#0B2240" stroke-width="2.5"/>
    <line x1="88" y1="91.5" x2="103" y2="91.5" stroke="#0B2240" stroke-width="2.5"/>
  </g>

  <!-- Brand Title -->
  <text x="500" y="260" text-anchor="middle" class="brand-title">MERIT REAL SOLUTIONS</text>

  <!-- Gold Divider Line -->
  <line x1="120" y1="310" x2="880" y2="310" stroke="#C88E28" stroke-width="3"/>
  <!-- Diamond Accent -->
  <polygon points="500,302 508,310 500,318 492,310" fill="#C88E28"/>

  <!-- Column Dividers -->
  <line x1="320" y1="360" x2="320" y2="470" stroke="#1D3E66" stroke-width="2"/>
  <line x1="510" y1="360" x2="510" y2="470" stroke="#1D3E66" stroke-width="2"/>
  <line x1="695" y1="360" x2="695" y2="470" stroke="#1D3E66" stroke-width="2"/>

  <!-- Pillar 1: TRUST -->
  <g transform="translate(160, 360)">
    <!-- Shield Icon -->
    <g transform="translate(22, 0)">
      <path d="M 24 4 C 24 4 40 10 46 14 C 46 30 42 46 24 56 C 6 46 2 30 2 14 C 8 10 24 4 24 4 Z" fill="none" stroke="#C88E28" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 14 27 L 22 35 L 35 20" fill="none" stroke="#D49B28" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="47" y="96" text-anchor="middle" class="pillar-title">TRUST</text>
  </g>

  <!-- Pillar 2: TRANSPARENCY -->
  <g transform="translate(365, 360)">
    <!-- Handshake Icon -->
    <g transform="translate(20, 0)" fill="none" stroke="#C88E28" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 6 22 L 18 10 C 22 6 28 6 32 10 L 38 16"/>
      <path d="M 48 22 L 36 10 C 32 6 26 6 22 10"/>
      <path d="M 10 26 L 22 38 C 25 41 30 41 33 38 L 44 27"/>
      <path d="M 16 32 L 22 38"/>
      <path d="M 21 37 L 26 42"/>
      <path d="M 26 42 L 31 47"/>
    </g>
    <text x="47" y="96" text-anchor="middle" class="pillar-title">TRANSPARENCY</text>
  </g>

  <!-- Pillar 3: VALUE -->
  <g transform="translate(560, 360)">
    <!-- House in Hand / Heart Icon -->
    <g transform="translate(20, 0)" fill="none" stroke="#C88E28" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 8 22 L 28 6 L 48 22 L 48 38 L 8 38 Z"/>
      <path d="M 28 18 C 28 18 23 13 19 17 C 15 21 21 28 28 33 C 35 28 41 21 37 17 C 33 13 28 18 28 18 Z" fill="#C88E28"/>
      <path d="M 2 40 C 12 50 44 50 54 40"/>
    </g>
    <text x="47" y="96" text-anchor="middle" class="pillar-title">VALUE</text>
  </g>

  <!-- Pillar 4: GROWTH -->
  <g transform="translate(755, 360)">
    <!-- Bar Chart + Arrow Icon -->
    <g transform="translate(20, 0)" fill="none" stroke="#C88E28" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="38" width="8" height="12" rx="1"/>
      <rect x="14" y="28" width="8" height="22" rx="1"/>
      <rect x="26" y="18" width="8" height="32" rx="1"/>
      <rect x="38" y="8" width="8" height="42" rx="1"/>
      <path d="M 2 32 L 20 18 L 32 22 L 48 2" stroke="#D49B28" stroke-width="4"/>
      <path d="M 36 2 L 48 2 L 48 14" stroke="#D49B28" stroke-width="4"/>
    </g>
    <text x="47" y="96" text-anchor="middle" class="pillar-title">GROWTH</text>
  </g>
</svg>
`;

// 4. Favicon Icon
const createFaviconSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="20" fill="#0B2240"/>
  <!-- White M -->
  <path d="M 16 80 L 16 20 L 42 62 L 68 20 L 84 20 L 84 80 L 68 80 L 68 40 L 48 72 L 36 72 L 28 58 L 28 80 Z" fill="#FFFFFF"/>
  <!-- Dark Gable Shadow -->
  <path d="M 34 60 L 62 34 L 84 60 L 84 80 L 34 80 Z" fill="#0B2240"/>
  <!-- Gold Roof -->
  <path d="M 60 22 L 88 52 L 88 80 L 72 80 L 72 64 L 60 52 L 48 64 L 38 56 Z" fill="#C88E28"/>
  <path d="M 28 62 L 60 20 L 92 50" fill="none" stroke="#D49B28" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Window -->
  <rect x="58" y="52" width="10" height="12" rx="1.5" fill="#FFFFFF"/>
  <line x1="63" y1="52" x2="63" y2="64" stroke="#0B2240" stroke-width="1.5"/>
  <line x1="58" y1="58" x2="68" y2="58" stroke="#0B2240" stroke-width="1.5"/>
</svg>
`;

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');

  const logoSvg = createHeaderLogoSvg();
  const verticalLogoSvg = createVerticalLogoSvg();
  const bannerSvg = createFullBannerSvg();
  const faviconSvg = createFaviconSvg();

  fs.writeFileSync(path.join(publicDir, 'logo.svg'), logoSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-vertical.svg'), verticalLogoSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-banner.svg'), bannerSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  console.log('SVG files generated successfully. Now rendering PNGs via Playwright...');

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Render logo.png (Horizontal)
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B2240;">${logoSvg}</body></html>`);
    await page.setViewportSize({ width: 650, height: 140 });
    await page.screenshot({ path: path.join(publicDir, 'logo.png') });

    // Render logo-vertical.png
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B2240;">${verticalLogoSvg}</body></html>`);
    await page.setViewportSize({ width: 700, height: 280 });
    await page.screenshot({ path: path.join(publicDir, 'logo-vertical.png') });

    // Render logo-banner.png
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B2240;">${bannerSvg}</body></html>`);
    await page.setViewportSize({ width: 1000, height: 560 });
    await page.screenshot({ path: path.join(publicDir, 'logo-banner.png') });

    await browser.close();
    console.log('All PNG screenshots rendered successfully!');
  } catch (e) {
    console.log('Playwright screenshot notice:', e.message);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
