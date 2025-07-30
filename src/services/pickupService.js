import ETAService from './etaService';

/**
 * Servicio para manejar el flujo completo de recogida
 * Estados del viaje y transiciones
 */

export const PICKUP_STATES = {
  SEARCHING: 'searching',           // Buscando conductor
  DRIVER_ASSIGNED: 'driver_assigned', // Conductor asignado
  DRIVER_EN_ROUTE: 'driver_en_route', // Conductor en camino
  DRIVER_ARRIVING: 'driver_arriving', // Conductor llegando (< 2 min)
  DRIVER_ARRIVED: 'driver_arrived',   // Conductor ha llegado
  PICKUP_COMPLETE: 'pickup_complete', // Pasajero recogido
  IN_TRIP: 'in_trip',               // En viaje
  TRIP_COMPLETE: 'trip_complete',   // Viaje completado
  CANCELLED: 'cancelled'            // Cancelado
};

class PickupService {
  constructor() {
    this.currentRide = null;
    this.etaUpdateInterval = null;
    this.locationUpdateInterval = null;
    this.callbacks = {
      onStateChange: [],
      onETAUpdate: [],
      onLocationUpdate: []
    };
  }

  /**
   * Registra callbacks para eventos
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Emite eventos a los callbacks registrados
   */
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Inicia un nuevo viaje
   */
  async startRide(pickupLocation, destination, passenger) {
    try {
      this.currentRide = {
        id: this.generateRideId(),
        passenger: passenger,
        pickupLocation: pickupLocation,
        destination: destination,
        state: PICKUP_STATES.SEARCHING,
        driver: null,
        eta: null,
        createdAt: new Date(),
        updates: []
      };

      this.addUpdate('Viaje iniciado, buscando conductor...');
      this.emit('onStateChange', {
        state: PICKUP_STATES.SEARCHING,
        ride: this.currentRide
      });

      // Simular búsqueda de conductor (en producción esto sería una llamada al backend)
      setTimeout(() => {
        this.assignDriver();
      }, 2000);

      return this.currentRide;
    } catch (error) {
      console.error('Error iniciando viaje:', error);
      throw error;
    }
  }

  /**
   * Asigna un conductor al viaje
   */
  async assignDriver() {
    if (!this.currentRide) return;

    try {
      // Simular conductor asignado (en producción vendría del backend)
      const mockDriver = {
        id: 'driver_' + Math.random().toString(36).substr(2, 9),
        name: 'Carlos Rodriguez',
        phone: '+1234567890',
        rating: 4.8,
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          year: 2020,
          plate: 'ABC-123',
          color: 'Blanco'
        },
        location: {
          lat: this.currentRide.pickupLocation.lat + (Math.random() - 0.5) * 0.01,
          lng: this.currentRide.pickupLocation.lng + (Math.random() - 0.5) * 0.01
        }
      };

      this.currentRide.driver = mockDriver;
      this.currentRide.state = PICKUP_STATES.DRIVER_ASSIGNED;

      this.addUpdate(`Conductor asignado: ${mockDriver.name}`);
      this.emit('onStateChange', {
        state: PICKUP_STATES.DRIVER_ASSIGNED,
        ride: this.currentRide
      });

      // Calcular ETA inicial
      await this.calculateAndUpdateETA();

      // Iniciar tracking de ubicación y ETA
      this.startLocationTracking();
      this.startETAUpdates();

      // Cambiar estado a "en camino"
      setTimeout(() => {
        this.setDriverEnRoute();
      }, 1000);

    } catch (error) {
      console.error('Error asignando conductor:', error);
    }
  }

  /**
   * Marca el conductor como "en camino"
   */
  setDriverEnRoute() {
    if (!this.currentRide || this.currentRide.state !== PICKUP_STATES.DRIVER_ASSIGNED) return;

    this.currentRide.state = PICKUP_STATES.DRIVER_EN_ROUTE;
    this.addUpdate('El conductor está en camino hacia tu ubicación');
    
    this.emit('onStateChange', {
      state: PICKUP_STATES.DRIVER_EN_ROUTE,
      ride: this.currentRide
    });
  }

  /**
   * Calcula y actualiza el ETA
   */
  async calculateAndUpdateETA() {
    if (!this.currentRide || !this.currentRide.driver) return;

    try {
      const eta = await ETAService.calculateETA(
        this.currentRide.driver.location,
        this.currentRide.pickupLocation
      );

      const previousETA = this.currentRide.eta;
      this.currentRide.eta = eta;

      // Verificar si el conductor está llegando (< 2 minutos)
      if (eta.etaMinutes <= 2 && this.currentRide.state === PICKUP_STATES.DRIVER_EN_ROUTE) {
        this.setDriverArriving();
      }

      // Verificar si el conductor ha llegado (< 30 segundos o muy cerca)
      if (eta.etaMinutes < 1 && eta.distance < 100 && this.currentRide.state === PICKUP_STATES.DRIVER_ARRIVING) {
        this.setDriverArrived();
      }

      this.emit('onETAUpdate', {
        eta: eta,
        previousETA: previousETA,
        ride: this.currentRide
      });

    } catch (error) {
      console.error('Error calculando ETA:', error);
    }
  }

  /**
   * Marca el conductor como "llegando"
   */
  setDriverArriving() {
    if (!this.currentRide) return;

    this.currentRide.state = PICKUP_STATES.DRIVER_ARRIVING;
    this.addUpdate('Tu conductor está llegando (menos de 2 minutos)');
    
    this.emit('onStateChange', {
      state: PICKUP_STATES.DRIVER_ARRIVING,
      ride: this.currentRide
    });
  }

  /**
   * Marca el conductor como "llegado"
   */
  setDriverArrived() {
    if (!this.currentRide) return;

    this.currentRide.state = PICKUP_STATES.DRIVER_ARRIVED;
    this.addUpdate('Tu conductor ha llegado');
    
    this.emit('onStateChange', {
      state: PICKUP_STATES.DRIVER_ARRIVED,
      ride: this.currentRide
    });

    // Detener updates de ETA cuando llegue
    this.stopETAUpdates();
  }

  /**
   * Inicia el tracking de ubicación del conductor
   */
  startLocationTracking() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
    }

    this.locationUpdateInterval = setInterval(() => {
      if (this.currentRide && this.currentRide.driver && 
          [PICKUP_STATES.DRIVER_EN_ROUTE, PICKUP_STATES.DRIVER_ARRIVING].includes(this.currentRide.state)) {
        
        // Simular movimiento del conductor hacia el pickup
        this.simulateDriverMovement();
      }
    }, 5000); // Actualizar cada 5 segundos
  }

  /**
   * Simula el movimiento del conductor hacia el punto de recogida
   */
  simulateDriverMovement() {
    if (!this.currentRide || !this.currentRide.driver) return;

    const driver = this.currentRide.driver;
    const pickup = this.currentRide.pickupLocation;

    // Mover el conductor lentamente hacia el pickup
    const latDiff = pickup.lat - driver.location.lat;
    const lngDiff = pickup.lng - driver.location.lng;

    // Moverse 10% de la distancia cada update
    driver.location.lat += latDiff * 0.1;
    driver.location.lng += lngDiff * 0.1;

    this.emit('onLocationUpdate', {
      driverLocation: driver.location,
      ride: this.currentRide
    });
  }

  /**
   * Inicia las actualizaciones de ETA
   */
  startETAUpdates() {
    if (this.etaUpdateInterval) {
      clearInterval(this.etaUpdateInterval);
    }

    this.etaUpdateInterval = setInterval(() => {
      if (this.currentRide && 
          [PICKUP_STATES.DRIVER_EN_ROUTE, PICKUP_STATES.DRIVER_ARRIVING].includes(this.currentRide.state)) {
        this.calculateAndUpdateETA();
      }
    }, 10000); // Actualizar ETA cada 10 segundos
  }

  /**
   * Detiene las actualizaciones de ETA
   */
  stopETAUpdates() {
    if (this.etaUpdateInterval) {
      clearInterval(this.etaUpdateInterval);
      this.etaUpdateInterval = null;
    }
  }

  /**
   * Detiene el tracking de ubicación
   */
  stopLocationTracking() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * Cancela el viaje actual
   */
  cancelRide(reason = 'Cancelado por el usuario') {
    if (!this.currentRide) return;

    this.currentRide.state = PICKUP_STATES.CANCELLED;
    this.addUpdate(`Viaje cancelado: ${reason}`);
    
    this.stopETAUpdates();
    this.stopLocationTracking();

    this.emit('onStateChange', {
      state: PICKUP_STATES.CANCELLED,
      ride: this.currentRide,
      reason: reason
    });
  }

  /**
   * Agrega una actualización al viaje
   */
  addUpdate(message) {
    if (this.currentRide) {
      this.currentRide.updates.push({
        timestamp: new Date(),
        message: message
      });
    }
  }

  /**
   * Genera un ID único para el viaje
   */
  generateRideId() {
    return 'ride_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtiene el viaje actual
   */
  getCurrentRide() {
    return this.currentRide;
  }

  /**
   * Obtiene el estado del mensaje para mostrar al usuario
   */
  getStateMessage(state, eta = null) {
    switch (state) {
      case PICKUP_STATES.SEARCHING:
        return 'Buscando conductor disponible...';
      case PICKUP_STATES.DRIVER_ASSIGNED:
        return 'Conductor asignado, calculando tiempo de llegada...';
      case PICKUP_STATES.DRIVER_EN_ROUTE:
        return eta ? `Tu conductor llegará en ${eta.etaMinutes} minutos` : 'Tu conductor está en camino';
      case PICKUP_STATES.DRIVER_ARRIVING:
        return eta ? `Tu conductor llegará en ${eta.etaMinutes} minutos` : 'Tu conductor está llegando';
      case PICKUP_STATES.DRIVER_ARRIVED:
        return 'Tu conductor ha llegado';
      case PICKUP_STATES.PICKUP_COMPLETE:
        return 'Viaje iniciado';
      case PICKUP_STATES.IN_TRIP:
        return 'En viaje hacia el destino';
      case PICKUP_STATES.TRIP_COMPLETE:
        return 'Viaje completado';
      case PICKUP_STATES.CANCELLED:
        return 'Viaje cancelado';
      default:
        return 'Estado desconocido';
    }
  }

  /**
   * Limpia el servicio
   */
  cleanup() {
    this.stopETAUpdates();
    this.stopLocationTracking();
    this.currentRide = null;
    this.callbacks = {
      onStateChange: [],
      onETAUpdate: [],
      onLocationUpdate: []
    };
  }
}

export default new PickupService();