import React, { useState, useCallback, useMemo } from 'react';
import { read, utils, write } from 'xlsx';
import saveAs from 'file-saver';
import { UploadIcon, ClipboardIcon, TrashIcon, DownloadIcon } from './Icons';
import DataGrid from './DataGrid';
import { useTranslations } from '../translations';

interface DataInputProps {
  title: string;
  onGridDataChange: (data: string[][]) => void;
  gridData: string[][];
  onReset: () => void;
  templateHeaders?: string[];
}

const DataInput: React.FC<DataInputProps> = ({ title, onGridDataChange, gridData, onReset, templateHeaders }) => {
  const t = useTranslations();
  const [fileName, setFileName] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  
  const handleDataChange = useCallback((data: string[][]) => {
      onGridDataChange(data);
      if(data.length > 1) { // Only reset analysis if new data is actually loaded
          onReset();
      }
  }, [onGridDataChange, onReset]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data instanceof ArrayBuffer) {
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: string[][] = utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        handleDataChange(jsonData);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset file input
  }, [handleDataChange]);
  
  const handleDownloadTemplate = useCallback(() => {
    if (!templateHeaders) return;

    const worksheet = utils.aoa_to_sheet([templateHeaders]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "template");

    const xlsxData = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const filename = title.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, '').trim().replace(/\s+/g, '_') + '_template.xlsx';
    saveAs(blob, filename);
  }, [templateHeaders, title]);

  const handlePasteButtonClick = useCallback(() => {
    setIsPasting(true);
  }, []);

  const processPastedText = useCallback(() => {
      if(!pasteText.trim()) return;
      const rows = pasteText.trim().replace(/\r\n/g, '\n').split('\n');
      const delimiter = rows[0].includes('\t') ? '\t' : ',';
      const data = rows.map(row => row.split(delimiter).map(cell => cell.trim()));
      handleDataChange(data);
      setIsPasting(false);
      setPasteText('');
  }, [pasteText, handleDataChange]);

  const handleClearData = useCallback(() => {
    onGridDataChange([[]]);
    setFileName('');
    onReset();
  }, [onGridDataChange, onReset]);

  const memoizedGrid = useMemo(() => (
    <DataGrid gridData={gridData} onGridDataChange={onGridDataChange} />
  ), [gridData, onGridDataChange]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-secondary mb-3">{title}</h3>
      
      <div className="flex space-x-2 mb-4">
        <label htmlFor={`file-upload-${title}`} className="flex-1 relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary border border-gray-300 p-2 flex items-center justify-center text-sm">
            <UploadIcon className="h-4 w-4 mr-2" />
            <span>{t.uploadFile}</span>
            <input id={`file-upload-${title}`} name={`file-upload-${title}`} type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
        </label>
        {templateHeaders && (
            <button
                type="button"
                onClick={handleDownloadTemplate}
                title={t.downloadTemplateTooltip}
                className="flex-1 bg-white rounded-md font-medium text-primary hover:text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-gray-300 p-2 flex items-center justify-center text-sm"
            >
                <DownloadIcon className="h-4 w-4 mr-2" />
                <span>{t.downloadTemplate}</span>
            </button>
        )}
        <button
            onClick={handlePasteButtonClick}
            className="flex-1 bg-white rounded-md font-medium text-primary hover:text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-gray-300 p-2 flex items-center justify-center text-sm"
        >
          <ClipboardIcon className="h-4 w-4 mr-2" />
            {t.pasteData}
        </button>
         <button
            onClick={handleClearData}
            className="flex-1 bg-white rounded-md font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 border border-gray-300 p-2 flex items-center justify-center text-sm"
            title={t.clearDataTooltip}
        >
            <TrashIcon className="h-4 w-4 mr-2" />
            <span>{t.clearData}</span>
        </button>
      </div>
      {fileName && <p className="text-xs text-gray-500 mb-2 -mt-2">{t.fileNameLabel} {fileName}</p>}
      
      {isPasting && (
          <div className="mb-2 p-2 border bg-white rounded-md shadow-sm">
              <textarea 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary transition duration-150 ease-in-out text-sm font-mono"
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={t.pastePlaceholder}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                    onClick={() => setIsPasting(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md text-sm"
                >
                    {t.cancel}
                </button>
                <button 
                    onClick={processPastedText}
                    className="bg-secondary hover:bg-primary text-white font-bold py-1 px-3 rounded-md text-sm"
                >
                    {t.process}
                </button>
              </div>
          </div>
      )}

      {/* Grid Display */}
      <div className="relative flex-grow min-h-[300px]">
        {memoizedGrid}
      </div>
    </div>
  );
};

export default DataInput;
