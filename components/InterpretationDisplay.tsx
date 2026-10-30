
import React from 'react';

interface InterpretationDisplayProps {
  text: string;
}

const InterpretationDisplay: React.FC<InterpretationDisplayProps> = ({ text }) => {
  const sections = text.split(/###\s\d\.\s/);
  
  const formatText = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Bold text: **text**
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        // Italic text: *text*
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Headers are handled by splitting
        if (line.trim() === '') {
            return <br key={index} />;
        }
        
        return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
      });
  };

  const titleAndContent = sections.slice(1).map(section => {
      const firstLineEnd = section.indexOf('\n');
      const title = section.substring(0, firstLineEnd).trim();
      const content = section.substring(firstLineEnd + 1).trim();
      return {title, content};
  });


  return (
    <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
      {titleAndContent.map(({ title, content }, index) => (
          <div key={index}>
              <h3 className="text-xl font-bold text-secondary border-b-2 border-secondary pb-2 mb-4">{title}</h3>
              <div>{formatText(content)}</div>
          </div>
      ))}
    </div>
  );
};

export default InterpretationDisplay;
