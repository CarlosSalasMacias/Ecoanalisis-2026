import React from 'react';

interface InterpretationDisplayProps {
  text: string;
}

/**
 * Muestra texto Markdown sencillo (##/### títulos, listas, **negrita**, *cursiva*) sin insertar HTML:
 * todo se renderiza como nodos de React, de modo que el texto de la IA o de los datos no puede
 * inyectar código. Las marcas [COMPARAR: …] se resaltan para que los autores las completen.
 */
const inline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[(?:COMPARAR|COMPARE|CITA NO VÁLIDA|INVALID CITATION)[^\]]*\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith('**')) parts.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('*')) parts.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else parts.push(<mark key={key} className="bg-amber-200 px-1 rounded">{tok}</mark>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const InterpretationDisplay: React.FC<InterpretationDisplayProps> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc pl-6 mb-3 space-y-1">{list}</ul>);
    list = [];
  };

  text.split('\n').forEach((raw, idx) => {
    const line = raw.trim();
    const k = `l${idx}`;
    if (!line || /^(-{3,}|_{3,})$/.test(line)) { flushList(); return; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const cls = level <= 2
        ? 'text-xl font-bold text-primary mt-6 mb-3'
        : 'text-lg font-bold text-secondary border-b-2 border-secondary pb-1 mt-5 mb-3';
      blocks.push(level <= 2 ? <h3 key={k} className={cls}>{inline(h[2], k)}</h3> : <h4 key={k} className={cls}>{inline(h[2], k)}</h4>);
      return;
    }
    const li = line.match(/^[-*•]\s+(.*)$/);
    if (li) { list.push(<li key={k}>{inline(li[1], k)}</li>); return; }
    flushList();
    blocks.push(<p key={k} className="mb-3 text-justify">{inline(line, k)}</p>);
  });
  flushList();

  return <div className="max-w-none text-gray-700">{blocks}</div>;
};

export default InterpretationDisplay;
