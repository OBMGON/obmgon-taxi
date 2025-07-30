import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente de mapa que maneja la visualización de ubicaciones
 * y rutas en tiempo real
 */
const MapComponent = ({ 
  userLocation, 
  driverLocation, 
  destination,
  pickupLocation,
  onMapLoaded,
  showRoute = true 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Inicializar el mapa
  useEffect(() => {
    if (!window.google || !window.google.maps) {
      console.error('Google Maps no está cargado');
      return;
    }

    if (mapRef.current && !mapInstanceRef.current) {
      const defaultCenter = userLocation || pickupLocation || { lat: -12.0464, lng: -77.0428 }; // Lima, Perú

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      if (onMapLoaded) {
        onMapLoaded(map);
      }
    }
  }, [userLocation, pickupLocation, onMapLoaded]);

  // Actualizar marcador del usuario/pickup
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    const location = userLocation || pickupLocation;
    if (!location) return;

    // Remover marcador existente
    if (markersRef.current.user) {
      markersRef.current.user.setMap(null);
    }

    // Crear nuevo marcador
    const marker = new window.google.maps.Marker({
      position: location,
      map: mapInstanceRef.current,
      title: 'Tu ubicación',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#4285F4" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      }
    });

    markersRef.current.user = marker;
  }, [userLocation, pickupLocation, isMapLoaded]);

  // Actualizar marcador del conductor
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !driverLocation) return;

    // Remover marcador existente
    if (markersRef.current.driver) {
      markersRef.current.driver.setMap(null);
    }

    // Crear nuevo marcador del conductor
    const marker = new window.google.maps.Marker({
      position: driverLocation,
      map: mapInstanceRef.current,
      title: 'Conductor',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#FFD700" stroke="white" stroke-width="2"/>
            <path d="M12 18 L28 18 L28 22 L24 22 L24 26 L16 26 L16 22 L12 22 Z" fill="black"/>
            <circle cx="16" cy="28" r="2" fill="black"/>
            <circle cx="24" cy="28" r="2" fill="black"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      }
    });

    markersRef.current.driver = marker;

    // Animar el movimiento del marcador si existe uno previo
    animateMarkerMovement(marker, driverLocation);

  }, [driverLocation, isMapLoaded]);

  // Actualizar marcador del destino
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !destination) return;

    // Remover marcador existente
    if (markersRef.current.destination) {
      markersRef.current.destination.setMap(null);
    }

    // Crear marcador del destino
    const marker = new window.google.maps.Marker({
      position: destination,
      map: mapInstanceRef.current,
      title: 'Destino',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0 C7.163 0 0 7.163 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7.163 24.837 0 16 0 Z" fill="#EA4335"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40)
      }
    });

    markersRef.current.destination = marker;
  }, [destination, isMapLoaded]);

  // Dibujar ruta
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !showRoute) return;
    if (!driverLocation || !(userLocation || pickupLocation)) return;

    // Remover ruta existente
    if (routeRef.current) {
      routeRef.current.setMap(null);
    }

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsRenderer.setMap(mapInstanceRef.current);
    routeRef.current = directionsRenderer;

    const origin = driverLocation;
    const destination = userLocation || pickupLocation;

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      } else {
        console.error('Error calculando ruta:', status);
      }
    });

  }, [driverLocation, userLocation, pickupLocation, showRoute, isMapLoaded]);

  // Ajustar vista del mapa para mostrar todos los marcadores
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Agregar puntos al bounds
    if (userLocation || pickupLocation) {
      bounds.extend(userLocation || pickupLocation);
      hasPoints = true;
    }
    
    if (driverLocation) {
      bounds.extend(driverLocation);
      hasPoints = true;
    }
    
    if (destination) {
      bounds.extend(destination);
      hasPoints = true;
    }

    if (hasPoints) {
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
    }
  }, [userLocation, pickupLocation, driverLocation, destination, isMapLoaded]);

  // Función para animar el movimiento de marcadores
  const animateMarkerMovement = (marker, newPosition) => {
    const currentPosition = marker.getPosition();
    if (!currentPosition) {
      marker.setPosition(newPosition);
      return;
    }

    const startLat = currentPosition.lat();
    const startLng = currentPosition.lng();
    const endLat = newPosition.lat;
    const endLng = newPosition.lng;

    let step = 0;
    const steps = 30;
    const stepTime = 100;

    const animate = () => {
      step++;
      const progress = step / steps;
      
      const lat = startLat + (endLat - startLat) * progress;
      const lng = startLng + (endLng - startLng) * progress;
      
      marker.setPosition({ lat, lng });

      if (step < steps) {
        setTimeout(animate, stepTime);
      }
    };

    animate();
  };

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '400px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }} 
    />
  );
};

export default MapComponent;