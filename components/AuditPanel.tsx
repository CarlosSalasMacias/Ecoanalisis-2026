import React from 'react';
import { AuditIssues, hasIssues } from '../services/report/aiReport';
import { useTranslations } from '../translations';

/** Resultado de la auditoría automática del texto redactado por la IA. */
const AuditPanel: React.FC<{ issues: AuditIssues }> = ({ issues }) => {
  const t = useTranslations();
  const problems = hasIssues(issues);
  return (
    <div className={`mb-4 p-3 rounded-md border text-sm ${problems ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-green-50 border-green-300 text-green-900'}`}>
      <p className="font-semibold mb-1">{problems ? t.auditWarningsTitle : t.auditOkTitle}</p>
      <ul className="list-disc pl-5 space-y-1">
        {issues.untraceableNumbers.length > 0 && <li>{t.auditUntraceable} <span className="font-mono">{issues.untraceableNumbers.join(', ')}</span></li>}
        {issues.unkeyedCitations.length > 0 && <li>{t.auditUnkeyed} <span className="italic">{issues.unkeyedCitations.join('; ')}</span></li>}
        {issues.invalidKeys.length > 0 && <li>{t.auditInvalidKeys} <span className="font-mono">{issues.invalidKeys.join(', ')}</span></li>}
        {issues.removedReferenceSection && <li>{t.auditRemovedReferences}</li>}
        {issues.placeholders > 0 && <li>{t.auditPlaceholders.replace('{n}', String(issues.placeholders))}</li>}
        <li>{t.auditAlwaysReview}</li>
      </ul>
    </div>
  );
};

export default AuditPanel;
