import React from 'react';
import { useLanguage } from '../LanguageContext';
import { useTranslations } from '../translations';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();

  const buttonStyle = "px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200";
  const activeStyle = "bg-white text-primary shadow-inner";
  const inactiveStyle = "bg-transparent text-white hover:bg-white/20";

  return (
    <div className="flex items-center space-x-1 p-1 bg-black/20 rounded-lg">
      <button
        onClick={() => setLanguage('es')}
        className={`${buttonStyle} ${language === 'es' ? activeStyle : inactiveStyle}`}
        aria-pressed={language === 'es'}
        aria-label={t.switchToSpanish}
      >
        ES
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`${buttonStyle} ${language === 'en' ? activeStyle : inactiveStyle}`}
        aria-pressed={language === 'en'}
        aria-label={t.switchToEnglish}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
