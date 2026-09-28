import React, { useState } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ThemeTokens } from '../types/lala';

interface PWAInstallButtonProps {
  t: ThemeTokens;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  t,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        style={{
          backgroundColor: `${t.primary}18`,
          color: t.primary,
          borderColor: `${t.primary}40`,
        }}
        className={`flex items-center gap-1.5 rounded-xl border font-bold transition hover:opacity-90 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'w-full px-3.5 py-2.5 text-xs justify-center'
        }`}
        title="Instalar aplicativo Casa da Lala na tela inicial (PWA Offline)"
      >
        <Download size={14} />
        <span className={compact ? 'hidden md:inline' : ''}>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          style={{
            backgroundColor: `${t.primary}18`,
            color: t.primary,
            borderColor: `${t.primary}40`,
          }}
          className={`flex items-center gap-1.5 rounded-xl border font-bold transition hover:opacity-90 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'w-full px-3.5 py-2.5 text-xs justify-center'
          }`}
          title="Instalar no iPhone / iPad"
        >
          <Smartphone size={14} />
          <span className={compact ? 'hidden md:inline' : ''}>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <div
              style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Smartphone size={16} style={{ color: t.primary }} />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg cursor-pointer"
                  style={{ backgroundColor: t.cardSubtle }}
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: t.textSoft }}>
                Para instalar o <strong>Casa da Lala</strong> na tela inicial do seu iOS com suporte 100% offline:
              </p>
              <ol className="text-xs space-y-2 pl-4 list-decimal" style={{ color: t.text }}>
                <li>
                  Toque no botão <strong>Compartilhar</strong>{' '}
                  <Share size={12} className="inline mx-0.5" /> na barra do Safari.
                </li>
                <li>
                  Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                style={{ backgroundColor: t.primary, color: '#fff' }}
                className="w-full rounded-xl py-2 text-xs font-bold cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
