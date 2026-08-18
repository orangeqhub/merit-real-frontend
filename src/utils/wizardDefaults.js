const BUILDING_RULE_KEYS = ['apartment', 'independentHouse', 'gatedCommunity'];

export function isBuildingType(ruleKey) {
  return BUILDING_RULE_KEYS.includes(ruleKey);
}

export function createEmptyWizardData() {
  return {
    // Step 1
    titleEn: '',
    categorySlug: '',
    ruleKey: '',
    transactionType: 'sale',
    descriptionEn: '',
    ventureName: '',

    // Step 2
    state: '',
    district: '',
    mandal: '',
    cityVillage: '',
    locality: '',
    landmark: '',
    pincode: '',
    address: '',
    mapLocation: '',
    latitude: null,
    longitude: null,

    // Step 3
    price: '',
    priceNegotiable: false,
    area: '',
    areaUnit: 'sqft',
    dimensions: '',
    pricePerUnit: '',

    // Step 4 (building)
    structure: {
      bedrooms: 0,
      bathrooms: 0,
      halls: 0,
      kitchens: 0,
      balconies: 0,
      floors: '',
      propertyFloor: '',
      furnishing: 'unfurnished',
      parking: '',
      facing: '',
      ageOfProperty: '',
    },
    // Step 4 (land)
    plotDetails: {
      plotLength: '',
      plotWidth: '',
      roadWidth: '',
      boundary: '',
      soilType: '',
      waterSource: '',
      electricity: '',
      irrigation: '',
      existingStructures: '',
      approvals: '',
    },
    extraSpaces: [],

    // Step 5
    amenities: [],

    // Step 6
    images: [],
    documents: {
      identityProof: null,
      ownershipProof: null,
    },

    // Step 7
    contactName: '',
    contactPhone: '',
    preferWhatsapp: true,
    preferCall: true,
    hidePhone: false,
  };
}
