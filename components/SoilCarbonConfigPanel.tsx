
import React, { useState, useEffect } from 'react';
import { SoilConfig, SoilConfigPerSite } from '../types';
import { useTranslations } from '../translations';

interface SoilCarbonConfigPanelProps {
  vegetationTypes: string[];
  siteHeaders: string[];
  onConfigChange: (config: SoilConfig) => void;
  onValidityChange: (isValid: boolean) => void;
}

const SoilCarbonConfigPanel: React.FC<SoilCarbonConfigPanelProps> = ({ 
    vegetationTypes, 
    siteHeaders, 
    onConfigChange, 
    onValidityChange 
}) => {
  const t = useTranslations();
  const [config, setConfig] = useState<SoilConfig>({});

  // Initialize config when veg types change
  useEffect(() => {
    const initial: SoilConfig = {};
    vegetationTypes.forEach(vt => {
      initial[vt] = {
        bulkDensity: '1.2',
        depth: '30',
        stoniness: '0',
        carbonColumn: siteHeaders.find(h => h.toLowerCase().includes('carbono') || h.toLowerCase().includes('materia organic')) || '',
        isSOM: false
      };
    });
    setConfig(initial);
  }, [vegetationTypes, siteHeaders]);

  const handleChange = (vegType: string, field: keyof SoilConfigPerSite, value: any) => {
    const newConfig = {
      ...config,
      [vegType]: { ...config[vegType], [field]: value }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const isConfigValid = vegetationTypes.every(vt => {
      const c = config[vt];
      if (!c) return false;
      return (
          c.bulkDensity && !isNaN(parseFloat(c.bulkDensity)) && 
          c.depth && !isNaN(parseFloat(c.depth)) && 
          c.carbonColumn !== ''
      );
  });

  useEffect(() => {
    onValidityChange(isConfigValid);
    if (isConfigValid) onConfigChange(config);
  }, [isConfigValid, config]);

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-primary mb-2">{t.soilConfigTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vegetationTypes.map(vt => (
                <div key={vt} className="p-3 border rounded-md bg-white space-y-3 shadow-sm">
                    <p className="font-bold text-secondary">{vt}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium text-gray-700">{t.bulkDensityLabel}</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={config[vt]?.bulkDensity || ''} 
                                onChange={e => handleChange(vt, 'bulkDensity', e.target.value)} 
                                className="w-full mt-1 p-1 border-gray-300 rounded text-xs" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-700">{t.depthLabel}</label>
                            <input 
                                type="number" 
                                value={config[vt]?.depth || ''} 
                                onChange={e => handleChange(vt, 'depth', e.target.value)} 
                                className="w-full mt-1 p-1 border-gray-300 rounded text-xs" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-700">{t.stoninessLabel}</label>
                        <input 
                            type="number" 
                            value={config[vt]?.stoniness || ''} 
                            onChange={e => handleChange(vt, 'stoniness', e.target.value)} 
                            className="w-full mt-1 p-1 border-gray-300 rounded text-xs" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-700">{t.carbonColumnLabel}</label>
                        <select 
                            value={config[vt]?.carbonColumn || ''} 
                            onChange={e => handleChange(vt, 'carbonColumn', e.target.value)}
                            className="w-full mt-1 p-1 border-gray-300 rounded text-xs"
                        >
                            <option value="">{t.selectColumn}</option>
                            {siteHeaders.filter(h => !['tipo de vegetación', 'parcela'].includes(h.toLowerCase())).map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            id={`som-${vt}`}
                            checked={config[vt]?.isSOM || false} 
                            onChange={e => handleChange(vt, 'isSOM', e.target.checked)}
                            className="h-3 w-3 rounded text-primary"
                        />
                        <label htmlFor={`som-${vt}`} className="ml-2 text-[10px] text-gray-600">{t.isSOMLabel}</label>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default SoilCarbonConfigPanel;
