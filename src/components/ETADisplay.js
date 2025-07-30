import React from 'react';
import { PICKUP_STATES } from '../services/pickupService';

/**
 * Componente para mostrar el ETA de forma prominente
 * Resuelve el problema de que no aparece el tiempo estimado
 */
const ETADisplay = ({ ride, eta, state }) => {
  if (!ride) return null;

  const getETADisplay = () => {
    if (!eta) {
      switch (state) {
        case PICKUP_STATES.SEARCHING:
          return {
            mainText: '⏳',
            subText: 'Buscando conductor...',
            bgColor: '#FFA500',
            textColor: '#FFFFFF'
          };
        case PICKUP_STATES.DRIVER_ASSIGNED:
          return {
            mainText: '🧮',
            subText: 'Calculando tiempo...',
            bgColor: '#4285F4',
            textColor: '#FFFFFF'
          };
        default:
          return {
            mainText: '⏱️',
            subText: 'Calculando...',
            bgColor: '#9E9E9E',
            textColor: '#FFFFFF'
          };
      }
    }

    // Mostrar ETA cuando está disponible
    const minutes = eta.etaMinutes;
    let displayText = '';
    let bgColor = '#4CAF50'; // Verde por defecto
    let icon = '🚗';

    if (minutes <= 1) {
      displayText = '< 1 min';
      bgColor = '#FF5722'; // Rojo para muy pronto
      icon = '🚕';
    } else if (minutes <= 2) {
      displayText = `${minutes} min`;
      bgColor = '#FF9800'; // Naranja para pronto
      icon = '🚖';
    } else if (minutes <= 5) {
      displayText = `${minutes} min`;
      bgColor = '#2196F3'; // Azul para normal
      icon = '🚗';
    } else {
      displayText = `${minutes} min`;
      bgColor = '#4CAF50'; // Verde para más tiempo
      icon = '🚙';
    }

    return {
      mainText: displayText,
      subText: `${icon} ${eta.distanceText || 'Calculando distancia...'}`,
      bgColor: bgColor,
      textColor: '#FFFFFF',
      isEstimate: eta.isEstimate || eta.method === 'haversine'
    };
  };

  const display = getETADisplay();

  const containerStyle = {
    backgroundColor: display.bgColor,
    color: display.textColor,
    padding: '16px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '16px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    background: `linear-gradient(135deg, ${display.bgColor} 0%, ${adjustBrightness(display.bgColor, -20)} 100%)`,
    border: '2px solid rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden'
  };

  const mainTextStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  };

  const subTextStyle = {
    fontSize: '14px',
    opacity: 0.9,
    margin: '0',
    fontWeight: '500'
  };

  const estimateTagStyle = {
    position: 'absolute',
    top: '4px',
    right: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold'
  };

  // Función para ajustar brillo del color
  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  return (
    <div style={containerStyle}>
      {display.isEstimate && (
        <div style={estimateTagStyle}>
          ~ Estimado
        </div>
      )}
      
      <div style={mainTextStyle}>
        {display.mainText}
      </div>
      
      <div style={subTextStyle}>
        {display.subText}
      </div>
      
      {/* Indicador de actualización en tiempo real */}
      {eta && state === PICKUP_STATES.DRIVER_EN_ROUTE && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#FFFFFF',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}></div>
          Actualizando en tiempo real
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/**
 * Componente compacto para mostrar ETA en header o toolbar
 */
export const ETACompact = ({ eta, state }) => {
  if (!eta && state !== PICKUP_STATES.DRIVER_EN_ROUTE && state !== PICKUP_STATES.DRIVER_ARRIVING) {
    return null;
  }

  const getCompactDisplay = () => {
    if (!eta) {
      return '⏱️ Calculando...';
    }

    const minutes = eta.etaMinutes;
    if (minutes <= 1) {
      return '🚕 < 1 min';
    } else {
      return `🚗 ${minutes} min`;
    }
  };

  return (
    <div style={{
      backgroundColor: '#333333',
      color: '#FFFFFF',
      padding: '6px 12px',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
      whiteSpace: 'nowrap'
    }}>
      {getCompactDisplay()}
    </div>
  );
};

export default ETADisplay;