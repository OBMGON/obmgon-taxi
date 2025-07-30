/**
 * Servicio para calcular ETA (Tiempo Estimado de Llegada)
 * Resuelve el problema de que no aparece el tiempo estimado
 */

class ETAService {
  constructor() {
    this.isCalculating = false;
    this.lastCalculation = null;
    this.cache = new Map();
  }

  /**
   * Calcula ETA usando Google Maps Distance Matrix API
   */
  async calculateETAWithGoogleMaps(driverLocation, pickupLocation) {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps no está cargado');
      }

      const service = new window.google.maps.DistanceMatrixService();
      
      return new Promise((resolve, reject) => {
        service.getDistanceMatrix({
          origins: [driverLocation],
          destinations: [pickupLocation],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false
        }, (response, status) => {
          if (status === window.google.maps.DistanceMatrixStatus.OK) {
            const element = response.rows[0].elements[0];
            if (element.status === 'OK') {
              const duration = element.duration.value; // en segundos
              const distance = element.distance.value; // en metros
              
              resolve({
                etaMinutes: Math.ceil(duration / 60),
                etaSeconds: duration,
                distance: distance,
                distanceText: element.distance.text,
                durationText: element.duration.text,
                method: 'google_maps'
              });
            } else {
              reject(new Error('No se pudo calcular la ruta'));
            }
          } else {
            reject(new Error('Error en Distance Matrix API: ' + status));
          }
        });
      });
    } catch (error) {
      console.error('Error calculando ETA con Google Maps:', error);
      throw error;
    }
  }

  /**
   * Calcula ETA usando distancia euclidiana como fallback
   */
  calculateETAWithHaversine(driverLocation, pickupLocation) {
    try {
      const R = 6371; // Radio de la Tierra en km
      const dLat = this.toRad(pickupLocation.lat - driverLocation.lat);
      const dLon = this.toRad(pickupLocation.lng - driverLocation.lng);
      
      const lat1 = this.toRad(driverLocation.lat);
      const lat2 = this.toRad(pickupLocation.lat);

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distancia en km

      // Estimación simple: 30 km/h promedio en ciudad
      const avgSpeedKmh = 30;
      const etaHours = distance / avgSpeedKmh;
      const etaMinutes = Math.ceil(etaHours * 60);

      return {
        etaMinutes: etaMinutes,
        etaSeconds: etaMinutes * 60,
        distance: distance * 1000, // convertir a metros
        distanceText: `${distance.toFixed(1)} km`,
        durationText: `${etaMinutes} min`,
        method: 'haversine'
      };
    } catch (error) {
      console.error('Error calculando ETA con Haversine:', error);
      throw error;
    }
  }

  toRad(value) {
    return value * Math.PI / 180;
  }

  /**
   * Método principal que intenta Google Maps primero, luego fallback
   */
  async calculateETA(driverLocation, pickupLocation, forceRefresh = false) {
    if (this.isCalculating && !forceRefresh) {
      return this.lastCalculation;
    }

    // Verificar cache
    const cacheKey = `${driverLocation.lat},${driverLocation.lng}-${pickupLocation.lat},${pickupLocation.lng}`;
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // Cache válido por 30 segundos
        return cached.data;
      }
    }

    this.isCalculating = true;

    try {
      // Intentar primero con Google Maps
      let result;
      try {
        result = await this.calculateETAWithGoogleMaps(driverLocation, pickupLocation);
      } catch (error) {
        console.warn('Google Maps falló, usando cálculo alternativo:', error);
        result = this.calculateETAWithHaversine(driverLocation, pickupLocation);
      }

      // Agregar información adicional
      result.timestamp = Date.now();
      result.isEstimate = result.method === 'haversine';
      
      // Guardar en cache
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      this.lastCalculation = result;
      return result;
      
    } catch (error) {
      console.error('Error calculando ETA:', error);
      // Fallback de emergencia
      return {
        etaMinutes: 5,
        etaSeconds: 300,
        distance: 1000,
        distanceText: '~1 km',
        durationText: '~5 min',
        method: 'fallback',
        isEstimate: true,
        error: true
      };
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * Actualiza ETA en tiempo real basado en nueva posición del conductor
   */
  async updateRealtimeETA(driverLocation, pickupLocation, previousETA) {
    try {
      const newETA = await this.calculateETA(driverLocation, pickupLocation, true);
      
      // Suavizar cambios bruscos
      if (previousETA && Math.abs(newETA.etaMinutes - previousETA.etaMinutes) > 3) {
        // Si la diferencia es muy grande, promediar
        newETA.etaMinutes = Math.round((newETA.etaMinutes + previousETA.etaMinutes) / 2);
        newETA.etaSeconds = newETA.etaMinutes * 60;
        newETA.durationText = `${newETA.etaMinutes} min`;
      }

      return newETA;
    } catch (error) {
      console.error('Error actualizando ETA en tiempo real:', error);
      return previousETA || null;
    }
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new ETAService();