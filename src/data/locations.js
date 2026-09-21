import { CITY_IMAGES } from './projectImages';

export const STATES = ['Andhra Pradesh', 'Telangana'];

export const DISTRICTS = {
  'Andhra Pradesh': ['Guntur', 'Krishna', 'Visakhapatnam', 'Prakasam'],
  Telangana: ['Hyderabad', 'Rangareddy', 'Warangal', 'Nalgonda'],
};

export const CITIES = [
  'Guntur',
  'Vijayawada',
  'Visakhapatnam',
  'Ongole',
  'Hyderabad',
  'Warangal',
  'Tenali',
  'Mangalagiri',
];

export const POPULAR_LOCATIONS = [
  { city: 'Guntur', count: 42, image: CITY_IMAGES.Guntur },
  { city: 'Vijayawada', count: 61, image: CITY_IMAGES.Vijayawada },
  { city: 'Hyderabad', count: 88, image: CITY_IMAGES.Hyderabad },
  { city: 'Mangalagiri', count: 23, image: CITY_IMAGES.Mangalagiri },
  { city: 'Tenali', count: 17, image: CITY_IMAGES.Tenali },
  { city: 'Ongole', count: 12, image: CITY_IMAGES.Ongole },
];
