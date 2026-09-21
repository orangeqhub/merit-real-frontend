import { PROJECT_IMAGES } from '../data/projectImages';
import {
  MAP_LAYOUT_URL,
  SRILAKSHMI_MAP_URL,
  DOKIPARRU_MAP_URL,
  MANJUNADHA_MAP_URL,
  VINFRA_MAP_URL,
  MANDIRA_MAP_URL,
} from '../services/mapBookingService';

/**
 * Registered public map layouts shown on the /map-layouts gallery and
 * embedded via /map-layout/:layoutKey. Keys mirror the standalone map app
 * that serves each layout: Anne Enclave lives in merit-map-layout-main,
 * Sri Lakshmi, Dokiparru and Manjunadha Enclave each in their own
 * standalone app (dev ports 5175, 5176 and 5183 respectively).
 *
 * This is the single registry driving the site's LAYOUTS section (homepage
 * LayoutsStrip, nav, /map-layouts gallery, /map-layout/:key detail page) --
 * deliberately separate from src/config/categories.js's property
 * Categories (Apartments/Villas/Lands/...), which are a different concept
 * (property types) fetched from the backend's /property-categories API.
 */
export const MAP_LAYOUTS = [
  {
    key: 'anne-enclave',
    title: 'Sky line Infra Anne Enclave',
    shortTitle: 'Anne Enclave',
    tagline:
      'Pan, zoom, and inspect plots on the interactive Anne Enclave layout. Book available plots from the status board.',
    phases: 2,
    phase1Total: 134,
    phase2Total: 138,
    phasesLabel: 'Phase 1 & Phase 2',
    mapBaseUrl: MAP_LAYOUT_URL,
    image: PROJECT_IMAGES.anneEnclaveAerial,
    imageAlt: 'Aerial view of the Sky Line Infra Anne Enclave plotted layout',
  },
  {
    key: 'sri-lakshmi',
    title: 'Sri Lakshmi Divine City',
    shortTitle: 'Sri Lakshmi',
    tagline:
      'Interactive Sri Lakshmi Divine City layout with live plot availability and booking.',
    phases: 1,
    phase1Total: null,
    phase2Total: 0,
    phasesLabel: 'Single Phase',
    mapBaseUrl: SRILAKSHMI_MAP_URL,
    image: PROJECT_IMAGES.field,
    imageAlt: 'Open plotted development field for the Sri Lakshmi layout',
  },
  {
    key: 'dokiparru',
    title: 'Elite Sky City',
    shortTitle: 'Elite Sky City',
    tagline:
      'Interactive Elite Sky City layout — search and inspect all 378 plots on the digitized site map.',
    phases: 1,
    phase1Total: null,
    phase2Total: 0,
    phasesLabel: 'Single Phase',
    mapBaseUrl: DOKIPARRU_MAP_URL,
    // Real aerial photograph of a residential development (free stock, Google).
    image: PROJECT_IMAGES.eliteSkyCityCover,
    imageAlt: 'Aerial photograph of a residential plotted development for the Elite Sky City layout',
  },
  {
    key: 'manjunadha-enclave',
    title: 'Manjunadha Enclave',
    shortTitle: 'Manjunadha Enclave',
    tagline:
      'Interactive Manjunadha Enclave layout on a live satellite map — search and inspect all 68 plots at their real geographic location.',
    phases: 1,
    phase1Total: null,
    phase2Total: 0,
    phasesLabel: 'Single Phase',
    mapBaseUrl: MANJUNADHA_MAP_URL,
    image: PROJECT_IMAGES.manjunadhaEnclaveLayout,
    imageAlt: 'Digitized Manjunadha Enclave layout plan',
  },
  {
    key: 'vinfra',
    title: 'V Infra ORR Nandana Vanam @ Saripudi',
    shortTitle: 'ORR Nandana Vanam',
    tagline:
      'Interactive ORR Nandana Vanam layout on a live satellite map — search and inspect all 196 plots at their real geographic location, right next to the Outer Ring Road.',
    phases: 1,
    phase1Total: null,
    phase2Total: 0,
    phasesLabel: 'Single Phase',
    mapBaseUrl: VINFRA_MAP_URL,
    // Real aerial photograph of lush green fields (free stock, Google) matching
    // the "Vanam" (garden/forest) theme of this layout.
    image: PROJECT_IMAGES.orrNandanaVanamCover,
    imageAlt: 'Aerial photograph of green fields for the ORR Nandana Vanam layout',
  },
  {
    key: 'mandira-developers',
    title: 'Mandira Developers Quantum City',
    shortTitle: 'Mandira Developers',
    tagline:
      'Interactive Mandira Developers Quantum City layout on a live satellite map — search and inspect all 193 plots at their real geographic location on the NH 167 AG highway.',
    phases: 1,
    phase1Total: null,
    phase2Total: 0,
    phasesLabel: 'Single Phase',
    mapBaseUrl: MANDIRA_MAP_URL,
    // Real aerial photograph of residential homes, roads and trees (free stock,
    // Google) for the Mandira Developers Quantum City layout.
    image: PROJECT_IMAGES.mandiraDevelopersCover,
    imageAlt: 'Aerial photograph of a residential neighbourhood for the Mandira Developers Quantum City layout',
  },
];

export function getMapLayoutByKey(key) {
  return MAP_LAYOUTS.find((l) => l.key === key) || MAP_LAYOUTS[0];
}

export function mapLayoutIframeUrl(key) {
  const layout =
    MAP_LAYOUTS.find((l) => l.key === key) || MAP_LAYOUTS[0];
  const extra = layout.key === 'anne-enclave' ? '&v=phase2-remaining' : '';
  return `${layout.mapBaseUrl}/?embed=1&layout=${encodeURIComponent(layout.key)}${extra}`;
}