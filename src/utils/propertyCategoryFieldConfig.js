/** Category-specific field definitions for Post Property (keyed by category slug). */

import { formatIndianNumber } from './formatIndianNumber';

const yesNo = { type: 'yesno' };
const text = { type: 'text' };
const number = { type: 'number' };
const textarea = { type: 'textarea' };

function multi(label, options) {
  return { type: 'multiselect', label, options };
}

export const CATEGORY_FIELD_SECTIONS = {
  'agricultural-land': {
    title: 'Agricultural Land Details',
    hint: 'Use the common Area field above for total land area.',
    fields: [
      { key: 'surveyNumber', label: 'Survey Number', ...text },
      { key: 'landType', label: 'Land Type', ...text },
      { key: 'soilType', label: 'Soil Type', ...text },
      { key: 'waterSource', label: 'Water Source', ...text },
      { key: 'borewell', label: 'Borewell', ...yesNo },
      { key: 'openWell', label: 'Open Well', ...yesNo },
      { key: 'irrigationFacility', label: 'Irrigation Facility', ...text },
      { key: 'electricityAvailable', label: 'Electricity Available', ...yesNo },
      { key: 'fencing', label: 'Fencing', ...yesNo },
      { key: 'roadAccess', label: 'Road Access', ...text },
      { key: 'existingCrops', label: 'Existing Crops', ...text },
      { key: 'plantationDetails', label: 'Plantation Details', ...textarea },
      { key: 'farmHouse', label: 'Farm House', ...yesNo },
      { key: 'distanceFromMainRoad', label: 'Distance from Main Road', ...text },
      { key: 'ownershipType', label: 'Ownership Type', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
    ],
  },
  'farm-land': {
    title: 'Farm Land Details',
    hint: 'Use the common Area field above for total land area.',
    fields: [
      { key: 'farmLandName', label: 'Farm / Land Name', ...text },
      { key: 'surveyNumber', label: 'Survey Number', ...text },
      { key: 'soilType', label: 'Soil Type', ...text },
      { key: 'waterSource', label: 'Water Source', ...text },
      { key: 'borewell', label: 'Borewell', ...text },
      { key: 'openWell', label: 'Open Well', ...text },
      { key: 'irrigation', label: 'Irrigation', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'fencing', label: 'Fencing', ...text },
      { key: 'roadAccess', label: 'Road Access', ...text },
      { key: 'existingPlantation', label: 'Existing Plantation', ...text },
      { key: 'existingCrops', label: 'Existing Crops', ...text },
      { key: 'farmHouse', label: 'Farm House', ...yesNo },
      { key: 'farmEquipmentFacilities', label: 'Farm Equipment / Facilities', ...textarea },
      { key: 'distanceFromMainRoad', label: 'Distance from Main Road', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
    ],
  },
  'residential-plot': {
    title: 'Residential Plot Details',
    hint: 'Use the common Area and Facing fields where applicable.',
    fields: [
      { key: 'plotSize', label: 'Plot Size / Plot Size Range', ...text },
      { key: 'plotType', label: 'Plot Type', ...text },
      { key: 'cornerPlot', label: 'Corner Plot', ...yesNo },
      { key: 'roadWidth', label: 'Road Width', ...text },
      { key: 'numberOfRoads', label: 'Number of Roads', ...text },
      { key: 'gatedLayout', label: 'Gated Layout', ...yesNo },
      { key: 'layoutProjectName', label: 'Layout / Project Name', ...text },
      { key: 'approvalAuthority', label: 'Layout Approval Authority', ...text },
      { key: 'approvalNumber', label: 'Approval Number', ...text },
      { key: 'reraNumber', label: 'RERA Number (if applicable)', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'water', label: 'Water', ...text },
      { key: 'drainage', label: 'Drainage', ...text },
      { key: 'compoundWall', label: 'Compound Wall', ...yesNo },
    ],
  },
  'open-plot': {
    title: 'Open Plot Details',
    hint: 'Use the common Area and Facing fields where applicable.',
    fields: [
      { key: 'plotSize', label: 'Plot Size / Plot Size Range', ...text },
      { key: 'plotType', label: 'Plot Type', ...text },
      { key: 'cornerPlot', label: 'Corner Plot', ...yesNo },
      { key: 'roadWidth', label: 'Road Width', ...text },
      { key: 'numberOfRoads', label: 'Number of Roads', ...text },
      { key: 'layoutProjectName', label: 'Layout / Project Name', ...text },
      { key: 'approvalAuthority', label: 'Approval Authority', ...text },
      { key: 'approvalNumber', label: 'Approval Number', ...text },
      { key: 'reraNumber', label: 'RERA Number (if applicable)', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'water', label: 'Water', ...text },
      { key: 'drainage', label: 'Drainage', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
    ],
  },
  'venture-plot': {
    title: 'Venture / Layout Details',
    hint: 'Use Number of Plots for the venture total — individual plot numbers are managed in Map Layout.',
    fields: [
      { key: 'ventureName', label: 'Venture / Layout Name', ...text },
      { key: 'phase', label: 'Phase', ...text },
      { key: 'numberOfPlots', label: 'Number of Plots', ...number },
      { key: 'plotSize', label: 'Plot Size / Plot Size Range', ...text },
      { key: 'plotType', label: 'Plot Type', ...text },
      { key: 'cornerPlot', label: 'Corner Plot', ...yesNo },
      { key: 'roadWidth', label: 'Road Width', ...text },
      { key: 'numberOfRoads', label: 'Number of Roads', ...text },
      { key: 'gatedLayout', label: 'Gated Layout', ...yesNo },
      { key: 'approvalAuthority', label: 'Layout Approval Authority', ...text },
      { key: 'approvalNumber', label: 'Approval Number', ...text },
      { key: 'reraNumber', label: 'RERA Number (if applicable)', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
      { key: 'internalRoads', label: 'Internal Roads', ...text },
      { key: 'streetLights', label: 'Street Lights', ...text },
      { key: 'drainage', label: 'Drainage', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'waterSupply', label: 'Water Supply', ...text },
      { key: 'park', label: 'Park', ...text },
      { key: 'clubhouse', label: 'Clubhouse', ...text },
      { key: 'security', label: 'Security', ...text },
      { key: 'compoundWall', label: 'Compound Wall', ...text },
    ],
  },
  'commercial-plot': {
    title: 'Commercial Plot Details',
    hint: 'Use the common Area field for plot size where applicable.',
    fields: [
      { key: 'plotSize', label: 'Plot Size', ...text },
      { key: 'commercialUsage', label: 'Commercial Usage', ...text },
      { key: 'zoning', label: 'Zoning', ...text },
      { key: 'roadWidth', label: 'Road Width', ...text },
      { key: 'frontage', label: 'Frontage', ...text },
      { key: 'cornerPlot', label: 'Corner Plot', ...yesNo },
      { key: 'numberOfRoads', label: 'Number of Roads', ...text },
      { key: 'permittedConstruction', label: 'Permitted Construction', ...text },
      { key: 'farFsi', label: 'FAR / FSI', ...text },
      { key: 'parkingAvailability', label: 'Parking Availability', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'water', label: 'Water', ...text },
      { key: 'drainage', label: 'Drainage', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
      {
        key: 'suitableFor',
        ...multi('Suitable For', ['Retail', 'Office', 'Showroom', 'Hotel', 'Hospital', 'Warehouse', 'Restaurant', 'Other']),
      },
    ],
  },
  'commercial-land': {
    title: 'Commercial Land Details',
    hint: 'Use the common Area field for total land area.',
    fields: [
      { key: 'surveyNumber', label: 'Survey Number', ...text },
      { key: 'landUseZoning', label: 'Land Use / Zoning', ...text },
      { key: 'roadWidth', label: 'Road Width', ...text },
      { key: 'frontage', label: 'Frontage', ...text },
      { key: 'cornerProperty', label: 'Corner Property', ...yesNo },
      { key: 'permittedUsage', label: 'Permitted Usage', ...text },
      { key: 'farFsi', label: 'FAR / FSI', ...text },
      { key: 'developmentPotential', label: 'Development Potential', ...text },
      { key: 'highwayAccess', label: 'Highway Access', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'water', label: 'Water', ...text },
      { key: 'drainage', label: 'Drainage', ...text },
      { key: 'developmentStatus', label: 'Development Status', ...text },
      {
        key: 'suitableFor',
        ...multi('Suitable For', ['Commercial Development', 'Warehouse', 'Retail', 'Hospitality', 'Office', 'Industrial', 'Other']),
      },
    ],
  },
  apartment: {
    title: 'Apartment Details',
    hint: 'Use the common Facing field where applicable.',
    fields: [
      { key: 'projectName', label: 'Project Name', ...text },
      { key: 'builderName', label: 'Builder / Developer Name', ...text },
      { key: 'bhk', label: 'BHK', ...text },
      { key: 'flatNumber', label: 'Flat Number', ...text },
      { key: 'floorNumber', label: 'Floor Number', ...text },
      { key: 'totalFloors', label: 'Total Floors', ...text },
      { key: 'builtUpArea', label: 'Built-up Area', ...text },
      { key: 'carpetArea', label: 'Carpet Area', ...text },
      { key: 'balconyArea', label: 'Balcony Area', ...text },
      { key: 'bedrooms', label: 'Number of Bedrooms', ...text },
      { key: 'bathrooms', label: 'Number of Bathrooms', ...text },
      { key: 'balconies', label: 'Number of Balconies', ...text },
      { key: 'parking', label: 'Parking', ...text },
      { key: 'furnishingStatus', label: 'Furnishing Status', ...text },
      { key: 'propertyAge', label: 'Property Age', ...text },
      { key: 'possessionStatus', label: 'Possession Status', ...text },
      { key: 'maintenanceCharges', label: 'Maintenance Charges', ...text },
      { key: 'reraNumber', label: 'RERA Number', ...text },
      { key: 'loanAvailability', label: 'Loan Availability', ...text },
      {
        key: 'apartmentAmenities',
        ...multi('Apartment Amenities', [
          'Lift',
          'Power Backup',
          'Security',
          'Gym',
          'Swimming Pool',
          'Clubhouse',
          "Children's Play Area",
          'Garden',
          'CCTV',
          'Visitor Parking',
        ]),
      },
    ],
  },
  villa: {
    title: 'Villa Details',
    hint: 'Use the common Facing field where applicable.',
    fields: [
      { key: 'projectCommunityName', label: 'Project / Community Name', ...text },
      { key: 'villaNumber', label: 'Villa Number (if applicable)', ...text },
      { key: 'bhk', label: 'BHK', ...text },
      { key: 'plotArea', label: 'Plot Area', ...text },
      { key: 'builtUpArea', label: 'Built-up Area', ...text },
      { key: 'carpetArea', label: 'Carpet Area', ...text },
      { key: 'numberOfFloors', label: 'Number of Floors', ...text },
      { key: 'bedrooms', label: 'Bedrooms', ...text },
      { key: 'bathrooms', label: 'Bathrooms', ...text },
      { key: 'balconies', label: 'Balconies', ...text },
      { key: 'parkingCapacity', label: 'Parking Capacity', ...text },
      { key: 'furnishingStatus', label: 'Furnishing Status', ...text },
      { key: 'propertyAge', label: 'Property Age', ...text },
      { key: 'possessionStatus', label: 'Possession Status', ...text },
      { key: 'gatedCommunity', label: 'Gated Community', ...yesNo },
      { key: 'reraNumber', label: 'RERA Number', ...text },
      {
        key: 'villaAmenities',
        ...multi('Villa Amenities', [
          'Garden',
          'Private Parking',
          'Private Pool',
          'Clubhouse',
          'Gym',
          'Security',
          'CCTV',
          "Children's Play Area",
          'Power Backup',
          'Visitor Parking',
        ]),
      },
    ],
  },
  'independent-house': {
    title: 'House Details',
    hint: 'Use the common Facing field where applicable.',
    fields: [
      { key: 'bhk', label: 'BHK', ...text },
      { key: 'plotArea', label: 'Plot Area', ...text },
      { key: 'builtUpArea', label: 'Built-up Area', ...text },
      { key: 'carpetArea', label: 'Carpet Area', ...text },
      { key: 'numberOfFloors', label: 'Number of Floors', ...text },
      { key: 'bedrooms', label: 'Bedrooms', ...text },
      { key: 'bathrooms', label: 'Bathrooms', ...text },
      { key: 'balconies', label: 'Balconies', ...text },
      { key: 'parkingCapacity', label: 'Parking Capacity', ...text },
      { key: 'terrace', label: 'Terrace', ...yesNo },
      { key: 'garden', label: 'Garden', ...yesNo },
      { key: 'furnishingStatus', label: 'Furnishing Status', ...text },
      { key: 'propertyAge', label: 'Property Age', ...text },
      { key: 'possessionStatus', label: 'Possession Status', ...text },
      { key: 'waterAvailability', label: 'Water Availability', ...text },
      { key: 'electricity', label: 'Electricity', ...text },
      { key: 'compoundWall', label: 'Compound Wall', ...yesNo },
    ],
  },
};

export function getCategorySection(slug) {
  if (!slug) return null;
  return CATEGORY_FIELD_SECTIONS[slug] || null;
}

export function emptyCategoryDetails(slug) {
  const section = getCategorySection(slug);
  if (!section) return {};
  const out = {};
  section.fields.forEach((field) => {
    if (field.type === 'multiselect') out[field.key] = [];
    else out[field.key] = '';
  });
  return out;
}

/** Human-readable rows for property detail page — only non-empty values. */
export function formatCategoryDetailsForDisplay(slug, details = {}) {
  const section = getCategorySection(slug);
  if (!section || !details || typeof details !== 'object') return [];

  return section.fields
    .map((field) => {
      const raw = details[field.key];
      if (raw == null || raw === '') return null;
      if (Array.isArray(raw)) {
        if (!raw.length) return null;
        return { label: field.label, value: raw.join(', ') };
      }
      const str = String(raw);
      const display = field.type === 'number' && /^-?\d+(?:\.\d+)?$/.test(str.trim())
        ? formatIndianNumber(str)
        : str;
      return { label: field.label, value: display };
    })
    .filter(Boolean);
}

export function getCategoryDetailsSectionTitle(slug) {
  return getCategorySection(slug)?.title || 'Property Details';
}
