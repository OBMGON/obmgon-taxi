import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import ETADisplay, { ETACompact } from './components/ETADisplay';
import PickupService, { PICKUP_STATES } from './services/pickupService';

/**
 * Aplicación principal que demuestra la solución al problema
 * de flujo de mapa y ETA que no aparece
 */
function App() {
  const [currentRide, setCurrentRide] = useState(null);
  const [eta, setEta] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [rideState, setRideState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Configurar event listeners del servicio de pickup
  useEffect(() => {
    // Listener para cambios de estado
    PickupService.on('onStateChange', (data) => {
      console.log('Estado cambiado:', data.state);
      setRideState(data.state);
      setCurrentRide(data.ride);
    });

    // Listener para actualizaciones de ETA
    PickupService.on('onETAUpdate', (data) => {
      console.log('ETA actualizado:', data.eta);
      setEta(data.eta);
    });

    // Listener para actualizaciones de ubicación
    PickupService.on('onLocationUpdate', (data) => {
      console.log('Ubicación actualizada:', data.driverLocation);
      setDriverLocation(data.driverLocation);
    });

    // Cleanup al desmontar
    return () => {
      PickupService.cleanup();
    };
  }, []);

  // Simular obtención de ubicación del usuario
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          // Ubicación por defecto (Lima, Perú)
          setUserLocation({ lat: -12.0464, lng: -77.0428 });
        }
      );
    } else {
      // Ubicación por defecto si no hay geolocalización
      setUserLocation({ lat: -12.0464, lng: -77.0428 });
    }
  };

  const startNewRide = async () => {
    if (!userLocation) {
      alert('Por favor permite el acceso a tu ubicación');
      return;
    }

    setIsLoading(true);
    try {
      const destination = {
        lat: userLocation.lat + 0.01, // Destino a 1km aprox
        lng: userLocation.lng + 0.01
      };

      const passenger = {
        id: 'user_123',
        name: 'Usuario Demo',
        phone: '+1234567890'
      };

      await PickupService.startRide(userLocation, destination, passenger);
    } catch (error) {
      console.error('Error iniciando viaje:', error);
      alert('Error iniciando el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelRide = () => {
    PickupService.cancelRide('Cancelado por el usuario');
    setCurrentRide(null);
    setEta(null);
    setDriverLocation(null);
    setRideState(null);
  };

  const getStateMessage = () => {
    if (!rideState) return '';
    return PickupService.getStateMessage(rideState, eta);
  };

  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  };

  const headerStyle = {
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const buttonStyle = {
    backgroundColor: '#4285F4',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#EA4335'
  };

  const statusCardStyle = {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const driverInfoStyle = {
    backgroundColor: '#FFFFFF',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, color: '#333' }}>Obmgon Taxi</h1>
        {eta && (
          <ETACompact eta={eta} state={rideState} />
        )}
      </div>

      {/* Estado actual */}
      {rideState && (
        <div style={statusCardStyle}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Estado del viaje</h3>
          <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
            {getStateMessage()}
          </p>
        </div>
      )}

      {/* Display de ETA prominente */}
      <ETADisplay ride={currentRide} eta={eta} state={rideState} />

      {/* Mapa */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Mapa</h3>
        <MapComponent
          userLocation={userLocation}
          driverLocation={driverLocation}
          pickupLocation={currentRide?.pickupLocation}
          destination={currentRide?.destination}
          showRoute={!!driverLocation}
        />
      </div>

      {/* Información del conductor */}
      {currentRide?.driver && (
        <div style={driverInfoStyle}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#4285F4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            {currentRide.driver.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>
              {currentRide.driver.name}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {currentRide.driver.vehicle.make} {currentRide.driver.vehicle.model} - {currentRide.driver.vehicle.plate}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              ⭐ {currentRide.driver.rating} • {currentRide.driver.phone}
            </div>
          </div>
        </div>
      )}

      {/* Controles */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {!currentRide ? (
          <button
            style={buttonStyle}
            onClick={startNewRide}
            disabled={isLoading || !userLocation}
          >
            {isLoading ? 'Iniciando viaje...' : 'Solicitar Taxi'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={cancelButtonStyle}
              onClick={cancelRide}
            >
              Cancelar Viaje
            </button>
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            <strong>Debug Info:</strong><br />
            Estado: {rideState || 'Ninguno'}<br />
            ETA: {eta ? `${eta.etaMinutes} min (${eta.method})` : 'No disponible'}<br />
            Conductor: {driverLocation ? `${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}` : 'No asignado'}<br />
            Usuario: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'No disponible'}
          </div>
        )}
      </div>

      {/* Updates del viaje */}
      {currentRide?.updates && currentRide.updates.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', marginTop: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Actualizaciones</h4>
          {currentRide.updates.slice(-3).reverse().map((update, index) => (
            <div key={index} style={{
              padding: '8px 0',
              borderBottom: index < currentRide.updates.slice(-3).length - 1 ? '1px solid #eee' : 'none',
              fontSize: '14px',
              color: '#666'
            }}>
              <span style={{ fontWeight: 'bold' }}>
                {new Date(update.timestamp).toLocaleTimeString()}
              </span>
              {' - '}
              {update.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;