import React from 'react';
import { useTema } from '../../contexto/ContextoTema';

interface LogoProps {
  size?: number | string;
  className?: string;
}

const LOGO_CLARO = '/logos/logo-claro-transparent.png?v=4';
const LOGO_OSCURO = '/logos/logo-oscuro-transparent.png';

/**
 * Logo Mercado Liebre — liebre en movimiento.
 * Modo claro: silueta negra. Modo oscuro: silueta blanca.
 */
export const Logo: React.FC<LogoProps> = ({ size = 24, className = '' }) => {
  const { tema } = useTema();
  const esOscuro = tema === 'dark';

  const dimensiones: React.CSSProperties = {
    width: size,
    aspectRatio: '1024 / 682',
    maxHeight: size,
  };

  // Modo claro: máscara + fondo negro = liebre siempre negra sobre cualquier fondo blanco
  if (!esOscuro) {
    return (
      <div
        role="img"
        aria-label="Mercado Liebre Logo"
        className={`shrink-0 select-none bg-black ${className}`}
        style={{
          ...dimensiones,
          WebkitMaskImage: `url(${LOGO_CLARO})`,
          maskImage: `url(${LOGO_CLARO})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    );
  }

  return (
    <img
      src={LOGO_OSCURO}
      alt="Mercado Liebre"
      aria-label="Mercado Liebre Logo"
      draggable={false}
      className={`shrink-0 select-none block object-contain ${className}`}
      style={dimensiones}
    />
  );
};
