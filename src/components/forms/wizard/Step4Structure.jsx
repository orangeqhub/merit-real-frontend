import { useTranslation } from 'react-i18next';
import { isBuildingType } from '../../../utils/wizardDefaults';
import ExtraSpaceControl from './ExtraSpaceControl';

const FACINGS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];

function Counter({ label, value, onChange, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, Number(value) - 1))} className="h-9 w-9 rounded-lg border border-gray-300 text-lg">-</button>
        <input
          id={id}
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm"
        />
        <button type="button" onClick={() => onChange(Number(value) + 1)} className="h-9 w-9 rounded-lg border border-gray-300 text-lg">+</button>
      </div>
    </div>
  );
}

export default function Step4Structure({ data, onChange }) {
  const { t } = useTranslation('forms');
  const building = isBuildingType(data.ruleKey);

  function updateStructure(patch) {
    onChange({ structure: { ...data.structure, ...patch } });
  }

  function updatePlot(patch) {
    onChange({ plotDetails: { ...data.plotDetails, ...patch } });
  }

  if (building) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Counter id="wz-bedrooms" label={t('wizard.bedrooms')} value={data.structure.bedrooms} onChange={(v) => updateStructure({ bedrooms: v })} />
          <Counter id="wz-bathrooms" label={t('wizard.bathrooms')} value={data.structure.bathrooms} onChange={(v) => updateStructure({ bathrooms: v })} />
          <Counter id="wz-halls" label={t('wizard.halls')} value={data.structure.halls} onChange={(v) => updateStructure({ halls: v })} />
          <Counter id="wz-kitchens" label={t('wizard.kitchens')} value={data.structure.kitchens} onChange={(v) => updateStructure({ kitchens: v })} />
          <Counter id="wz-balconies" label={t('wizard.balconies')} value={data.structure.balconies} onChange={(v) => updateStructure({ balconies: v })} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wz-floors" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.floors')}</label>
            <input id="wz-floors" type="number" min="0" value={data.structure.floors} onChange={(e) => updateStructure({ floors: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="wz-propfloor" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.propertyFloor')}</label>
            <input id="wz-propfloor" type="number" min="0" value={data.structure.propertyFloor} onChange={(e) => updateStructure({ propertyFloor: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wz-furnishing" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.furnishing')}</label>
            <select id="wz-furnishing" value={data.structure.furnishing} onChange={(e) => updateStructure({ furnishing: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="unfurnished">Unfurnished</option>
              <option value="semi">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </div>
          <div>
            <label htmlFor="wz-parking" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.parking')}</label>
            <input id="wz-parking" value={data.structure.parking} onChange={(e) => updateStructure({ parking: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wz-facing" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.facing')}</label>
            <select id="wz-facing" value={data.structure.facing} onChange={(e) => updateStructure({ facing: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="">-</option>
              {FACINGS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="wz-age" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.ageOfProperty')}</label>
            <input id="wz-age" value={data.structure.ageOfProperty} onChange={(e) => updateStructure({ ageOfProperty: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <ExtraSpaceControl ruleKey={data.ruleKey} extraSpaces={data.extraSpaces} onChange={(v) => onChange({ extraSpaces: v })} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-plotlength" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.plotLength')}</label>
          <input id="wz-plotlength" value={data.plotDetails.plotLength} onChange={(e) => updatePlot({ plotLength: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-plotwidth" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.plotWidth')}</label>
          <input id="wz-plotwidth" value={data.plotDetails.plotWidth} onChange={(e) => updatePlot({ plotWidth: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-facing-plot" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.facing')}</label>
          <select id="wz-facing-plot" value={data.plotDetails.facing} onChange={(e) => updatePlot({ facing: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {FACINGS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="wz-roadwidth" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.roadWidth')}</label>
          <input id="wz-roadwidth" value={data.plotDetails.roadWidth} onChange={(e) => updatePlot({ roadWidth: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-boundary" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.boundary')}</label>
          <input id="wz-boundary" value={data.plotDetails.boundary} onChange={(e) => updatePlot({ boundary: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-soil" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.soilType')}</label>
          <input id="wz-soil" value={data.plotDetails.soilType} onChange={(e) => updatePlot({ soilType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-water" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.waterSource')}</label>
          <input id="wz-water" value={data.plotDetails.waterSource} onChange={(e) => updatePlot({ waterSource: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-electricity" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.electricity')}</label>
          <input id="wz-electricity" value={data.plotDetails.electricity} onChange={(e) => updatePlot({ electricity: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-irrigation" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.irrigation')}</label>
          <input id="wz-irrigation" value={data.plotDetails.irrigation} onChange={(e) => updatePlot({ irrigation: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-existing" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.existingStructures')}</label>
          <input id="wz-existing" value={data.plotDetails.existingStructures} onChange={(e) => updatePlot({ existingStructures: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="wz-approvals" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.approvals')}</label>
        <input id="wz-approvals" value={data.plotDetails.approvals} onChange={(e) => updatePlot({ approvals: e.target.value })} placeholder="e.g. DTCP, RERA" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
      </div>

      <ExtraSpaceControl ruleKey={data.ruleKey} extraSpaces={data.extraSpaces} onChange={(v) => onChange({ extraSpaces: v })} />
    </div>
  );
}
