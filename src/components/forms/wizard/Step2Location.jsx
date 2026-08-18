import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { STATES, DISTRICTS, CITIES } from '../../../data/locations';
import MapLocationPicker from '../MapLocationPicker';
import { loadGoogleMaps, isGoogleMapsAvailable } from '../../../utils/googleMapsLoader';

export default function Step2Location({ data, onChange, errors }) {
  const { t } = useTranslation('forms');
  const districtOptions = data.state ? DISTRICTS[data.state] || [] : Object.values(DISTRICTS).flat();
  const addressRef = useRef(null);
  const autocompleteInitRef = useRef(false);

  // Sync external data.address changes to the uncontrolled input DOM value.
  // Fires when MapLocationPicker or Google autocomplete updates data.address.
  useEffect(() => {
    if (addressRef.current && addressRef.current.value !== (data.address || '')) {
      addressRef.current.value = data.address || '';
    }
  }, [data.address]);

  // Initialize Google Places Autocomplete on the address input — UNCONTROLLED
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || autocompleteInitRef.current) return;
      if (!addressRef.current || !isGoogleMapsAvailable()) return;
      const ac = new window.google.maps.places.Autocomplete(addressRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'address_components', 'geometry.location'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place) return;
        const patch = {};
        if (place.formatted_address) {
          patch.address = place.formatted_address;
          if (addressRef.current) addressRef.current.value = place.formatted_address;
        }
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          patch.latitude = loc.lat();
          patch.longitude = loc.lng();
          patch.mapLocation = `${loc.lat().toFixed(6)}, ${loc.lng().toFixed(6)}`;
        }
        const comps = place.address_components || [];
        const find = (type) => {
          const c = comps.find((x) => x.types.includes(type));
          return c ? c.long_name : '';
        };
        const pincode = find('postal_code');
        if (pincode) patch.pincode = pincode;
        const city = find('locality') || find('sublocality') || find('administrative_area_level_2');
        if (city) patch.cityVillage = city;
        const district = find('administrative_area_level_2');
        if (district) patch.district = district;
        const state = find('administrative_area_level_1');
        if (state) patch.state = state;
        const mandal = find('sublocality_level_1') || find('sublocality');
        if (mandal) patch.mandal = mandal;
        if (Object.keys(patch).length) onChange(patch);
      });
      autocompleteInitRef.current = true;
    });
    return () => { cancelled = true; };
  }, []);

  function handleMapPick(pick) {
    const patch = {};
    if (pick.mapLocation) patch.mapLocation = pick.mapLocation;
    if (pick.address) {
      patch.address = pick.address;
      if (addressRef.current) addressRef.current.value = pick.address;
    }
    if (pick.latitude != null) patch.latitude = pick.latitude;
    if (pick.longitude != null) patch.longitude = pick.longitude;
    onChange(patch);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-state" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.state')}</label>
          <select id="wz-state" value={data.state} onChange={(e) => onChange({ state: e.target.value, district: '' })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="wz-district" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.district')}</label>
          <select id="wz-district" value={data.district} onChange={(e) => onChange({ district: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors?.district && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-mandal" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.mandal')}</label>
          <input id="wz-mandal" value={data.mandal} onChange={(e) => onChange({ mandal: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-city" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.cityVillage')}</label>
          <select id="wz-city" value={data.cityVillage} onChange={(e) => onChange({ cityVillage: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors?.cityVillage && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-locality" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.locality')}</label>
          <input id="wz-locality" value={data.locality} onChange={(e) => onChange({ locality: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-landmark" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.landmark')}</label>
          <input id="wz-landmark" value={data.landmark} onChange={(e) => onChange({ landmark: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-pincode" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.pincode')}</label>
          <input id="wz-pincode" value={data.pincode} onChange={(e) => onChange({ pincode: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          {errors?.pincode && <p className="mt-1 text-xs text-red-600">{t('validation.invalidPincode')}</p>}
        </div>
        <div>
          <label htmlFor="wz-address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.address')}</label>
          <input
            ref={addressRef}
            id="wz-address"
            type="text"
            defaultValue={data.address}
            placeholder="Start typing to search address..."
            onBlur={(e) => onChange({ address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          {errors?.address && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <MapLocationPicker
        value={data.mapLocation}
        onChange={handleMapPick}
      />
    </div>
  );
}
