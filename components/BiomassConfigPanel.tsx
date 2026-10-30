

import React, { useState, useEffect, useMemo } from 'react';
import { BiomassConfig, EquationSelection, PlotInfo } from '../types';
import { DEFAULT_CARBON_FRACTION, EQUATION_OPTIONS } from '../services/analysisService';
import { useTranslations } from '../translations';

interface BiomassConfigPanelProps {
  vegetationTypes: string[];
  onConfigChange: (config: BiomassConfig) => void;
  onValidityChange: (isValid: boolean) => void;
}

const BiomassConfigPanel: React.FC<BiomassConfigPanelProps> = ({ vegetationTypes, onConfigChange, onValidityChange }) => {
  const t = useTranslations();
  const [equationSelections, setEquationSelections] = useState<EquationSelection>({});
  const [plotInfo, setPlotInfo] = useState<PlotInfo>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [carbonFractionText, setCarbonFractionText] = useState<string>(String(DEFAULT_CARBON_FRACTION));
  const carbonFraction = parseFloat(carbonFractionText.replace(',', '.'));
  const carbonFractionValid = carbonFraction > 0 && carbonFraction < 1;

  // Reset state when vegetation types change (e.g., new file loaded)
  useEffect(() => {
    setEquationSelections({});
    setPlotInfo({});
    setDescriptions({});
  }, [vegetationTypes]);

  const handleEquationChange = (vegType: string, value: string) => {
    setEquationSelections(prev => ({ ...prev, [vegType]: value }));
  };

  const handlePlotInfoChange = (vegType: string, field: 'numPlots' | 'plotArea', value: string) => {
    setPlotInfo(prev => ({
      ...prev,
      [vegType]: { ...prev[vegType], [field]: value }
    }));
  };
  
  const handleDescriptionChange = (vegType: string, value: string) => {
    setDescriptions(prev => ({ ...prev, [vegType]: value }));
  };

  const isConfigValid = useMemo(() => {
    if (vegetationTypes.length === 0 || !carbonFractionValid) return false;
    return vegetationTypes.every(vt => {
        const eqSelected = equationSelections[vt] && equationSelections[vt] !== '';
        const numPlotsValid = plotInfo[vt]?.numPlots && !isNaN(parseFloat(plotInfo[vt].numPlots)) && parseFloat(plotInfo[vt].numPlots) > 0;
        const plotAreaValid = plotInfo[vt]?.plotArea && !isNaN(parseFloat(plotInfo[vt].plotArea)) && parseFloat(plotInfo[vt].plotArea) > 0;
        return eqSelected && numPlotsValid && plotAreaValid;
    });
  }, [vegetationTypes, equationSelections, plotInfo, carbonFractionValid]);
  
  const sortedEquationOptions = useMemo(() => {
    return Object.entries(EQUATION_OPTIONS)
      .filter(([key]) => key !== '')
      .sort(([, a], [, b]) => a.localeCompare(b));
  }, []);


  useEffect(() => {
    onValidityChange(isConfigValid);
    if (isConfigValid) {
        onConfigChange({ selections: equationSelections, plotInfo, descriptions, carbonFraction });
    }
  }, [isConfigValid, equationSelections, plotInfo, descriptions, carbonFraction, onValidityChange, onConfigChange]);

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-primary mb-2">{t.biomassConfigPanelTitle}</h3>
        <p className="text-gray-600 mb-4">{t.biomassConfigDescription}</p>

        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
            <div className="flex flex-wrap items-end gap-3 p-3 bg-white border rounded-md">
                <div>
                    <label htmlFor="carbon-fraction" className="text-sm font-medium text-gray-700">{t.carbonFraction}</label>
                    <input id="carbon-fraction" type="number" step="0.001" min="0.3" max="0.6" value={carbonFractionText} onChange={e => setCarbonFractionText(e.target.value)} className={`w-28 mt-1 p-2 border rounded-md shadow-sm text-sm ${carbonFractionValid ? 'border-gray-300' : 'border-red-500'}`} />
                </div>
                <p className="text-xs text-gray-500 flex-1 min-w-[200px]">{t.carbonFractionHelp}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vegetationTypes.map(vt => (
                    <div key={vt} className="p-3 border rounded-md bg-white space-y-3 shadow-sm">
                        <p className="font-bold text-primary">{vt}</p>
                        <div>
                            <label className="text-sm font-medium text-gray-700">{t.selectAllometricEquation}</label>
                            <select value={equationSelections[vt] || ''} onChange={e => handleEquationChange(vt, e.target.value)} className="w-full mt-1 p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm">
                                <option value="">{EQUATION_OPTIONS['']}</option>
                                {sortedEquationOptions.map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700">{t.numPlots}</label>
                                <input type="number" min="1" value={plotInfo[vt]?.numPlots || ''} onChange={e => handlePlotInfoChange(vt, 'numPlots', e.target.value)} className="w-full mt-1 p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">{t.plotArea}</label>
                                <input type="number" min="1" value={plotInfo[vt]?.plotArea || ''} onChange={e => handlePlotInfoChange(vt, 'plotArea', e.target.value)} className="w-full mt-1 p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm" />
                            </div>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-700">{t.siteCharacterization}</label>
                            <textarea
                                value={descriptions[vt] || ''}
                                onChange={e => handleDescriptionChange(vt, e.target.value)}
                                className="w-full mt-1 p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                                rows={3}
                                placeholder={t.siteCharacterizationPlaceholder}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default BiomassConfigPanel;