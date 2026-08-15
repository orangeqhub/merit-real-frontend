/**
 * Central registry of all local project/property images.
 * Images are imported through Vite so they are hashed and bundled
 * into the production build (deployment-safe — no remote hosting).
 */
import anneEnclaveAerial from '../assets/properties/anne-enclave-aerial.jpg';
import building from '../assets/properties/building.jpg';
import field from '../assets/properties/field.jpg';
import villa from '../assets/properties/villa.jpg';
import villaExterior from '../assets/properties/villa-exterior.jpg';
import cityGuntur from '../assets/properties/city-guntur.jpg';
import cityVijayawada from '../assets/properties/city-vijayawada.jpg';
import cityHyderabad from '../assets/properties/city-hyderabad.jpg';
import cityMangalagiri from '../assets/properties/city-mangalagiri.jpg';
import cityTenali from '../assets/properties/city-tenali.jpg';
import cityOngole from '../assets/properties/city-ongole.jpg';

/** Individual named project images. */
export const PROJECT_IMAGES = {
  anneEnclaveAerial,
  building,
  field,
  villa,
  villaExterior,
};

/** Images for the popular-locations strip, keyed by city name. */
export const CITY_IMAGES = {
  Guntur: cityGuntur,
  Vijayawada: cityVijayawada,
  Hyderabad: cityHyderabad,
  Mangalagiri: cityMangalagiri,
  Tenali: cityTenali,
  Ongole: cityOngole,
};

/** Reusable list of all property/project photographs (galleries, cards). */
export const PROPERTY_GALLERY = [
  {
    id: 'anne-enclave-aerial',
    name: 'Anne Enclave Aerial',
    src: anneEnclaveAerial,
    alt: 'Aerial view of the Sky Line Infra Anne Enclave plotted layout',
  },
  {
    id: 'building',
    name: 'Building',
    src: building,
    alt: 'Modern residential building',
  },
  {
    id: 'field',
    name: 'Field',
    src: field,
    alt: 'Open plotted development field',
  },
  {
    id: 'villa',
    name: 'Villa',
    src: villa,
    alt: 'Premium villa property',
  },
  {
    id: 'villa-exterior',
    name: 'Villa Exterior',
    src: villaExterior,
    alt: 'Modern villa exterior',
  },
];

/** Homepage hero slides built from local project photographs. */
export const HERO_IMAGES = [
  {
    id: 'local-building',
    image: building,
    alt: 'Modern residential building',
    headingEn: 'Premium Plotted Developments',
    subtitleEn: 'Own a plot in a secure, gated layout',
  },
  {
    id: 'local-field',
    image: field,
    alt: 'Open plotted development field',
    headingEn: 'Open Plots & Land',
    subtitleEn: 'Choose the perfect plot for your dream home',
  },
  {
    id: 'local-villa',
    image: villa,
    alt: 'Premium villa property',
    headingEn: 'Dream Villas & Homes',
    subtitleEn: 'Modern homes built for comfortable living',
  },
];

/** Default placeholder used when a property/project image is missing or fails. */
export const DEFAULT_PROPERTY_IMAGE = building;
