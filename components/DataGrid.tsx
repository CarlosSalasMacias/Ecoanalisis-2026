
import React from 'react';
import { useTranslations } from '../translations';

interface DataGridProps {
  gridData: string[][];
  onGridDataChange: (newData: string[][]) => void;
}

const DataGrid: React.FC<DataGridProps> = ({ gridData, onGridDataChange }) => {
  const t = useTranslations();

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = gridData.map(row => [...row]); // Deep copy
    if(newData[rowIndex]) {
        newData[rowIndex][colIndex] = value;
        onGridDataChange(newData);
    }
  };

  if (!gridData || gridData.length === 0 || (gridData.length === 1 && gridData[0].length === 0)) {
    return <div className="p-4 text-center text-gray-400 bg-gray-100 rounded-md flex-grow flex items-center justify-center">{t.noData}</div>;
  }

  const headers = gridData[0] || [];
  const bodyRows = gridData.slice(1);

  return (
    <div className="absolute inset-0 w-full h-full overflow-auto border border-gray-300 rounded-md bg-white">
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
                {headers.map((header, colIndex) => {
                    const isScientificNameCol = ['género', 'familia'].includes(header.toLowerCase()) || header.toLowerCase().includes('científico');
                    return (
                        <th key={colIndex} className={`p-2 border-b-2 border-gray-300 font-semibold text-xs text-gray-600 uppercase tracking-wider text-left whitespace-nowrap ${isScientificNameCol ? 'italic' : ''}`}>
                            {/* FIX: Use the new header function from the translation hook */}
                            {t.header(header)}
                        </th>
                    );
                })}
            </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, colIndex) => {
                const header = headers[colIndex] || '';
                const isScientificNameCol = ['género', 'familia'].includes(header.toLowerCase()) || header.toLowerCase().includes('científico');
                return (
                  <td key={colIndex} className="border-t border-gray-200">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex + 1, colIndex, e.target.value)}
                      className={`w-full h-full p-1.5 border-none outline-none focus:ring-2 focus:ring-inset focus:ring-primary bg-transparent font-mono text-xs ${isScientificNameCol ? 'italic' : ''}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;