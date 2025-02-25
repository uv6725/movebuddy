import React, { useEffect, useRef, useState } from 'react';
import { Loader, Plus, Minus, RotateCcw, X, Clock, CalendarDays } from 'lucide-react';
import type { ViewMode } from '../types';

interface RouteStop {
  id: string;
  address: string;
  placeId?: string;
}

interface RouteSegment {
  from: string;
  to: string;
  distance: string;
  duration: string;
  color: string;
  trafficDuration?: string;
  predictedTime?: {
    enabled: boolean;
    dateTime?: Date;
    duration?: string;
  };
}

interface RoutePlanningProps {
  viewMode: ViewMode;
}

const OFFICE_ADDRESS = "5450 Katella Ave Suite 104, Los Alamitos, CA 90720";
const ROUTE_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFA500', 
  '#800080', '#008080', '#FF69B4', '#4B0082'
];

const MAPS_API_KEY = 'AIzaSyDLqIkdsI2XU7AEmj1ROARqunAkoqj92OM';

export function RoutePlanning({ viewMode }: RoutePlanningProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [stops, setStops] = useState<RouteStop[]>([
    { id: '1', address: '' }
  ]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderers, setDirectionsRenderers] = useState<google.maps.DirectionsRenderer[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [officePlace, setOfficePlace] = useState<google.maps.places.PlaceResult | null>(null);
  const autocompleteRefs = useRef<{ [key: string]: google.maps.places.Autocomplete | null }>({});
  const isScriptLoading = useRef(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [distanceMatrix, setDistanceMatrix] = useState<google.maps.DistanceMatrixService | null>(null);

  const [streetViewInfo, setStreetViewInfo] = useState<{
    isOpen: boolean;
    position?: google.maps.LatLng;
    address?: string;
    label?: string;
  } | null>(null);

  const streetViewRef = useRef<HTMLDivElement>(null);
  const streetViewPanorama = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (streetViewInfo?.isOpen && streetViewRef.current && streetViewInfo.position) {
      streetViewPanorama.current = new google.maps.StreetViewPanorama(streetViewRef.current, {
        position: streetViewInfo.position,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: true,
        fullscreenControl: true,
      });
    }
  }, [streetViewInfo?.isOpen]);

  useEffect(() => {
    if (!mapRef.current || map) return;

    const loadGoogleMaps = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.google?.maps) {
          resolve();
          return;
        }

        if (isScriptLoading.current) {
          const checkLoaded = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkLoaded);
              resolve();
            }
          }, 100);
          return;
        }

        isScriptLoading.current = true;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps API'));
        
        document.head.appendChild(script);
      });
    };

    const initializeMap = async () => {
      try {
        await loadGoogleMaps();
        
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: 33.7955, lng: -118.0722 },
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        const directionsServiceInstance = new google.maps.DirectionsService();
        const placesService = new google.maps.places.PlacesService(mapInstance);
        const distanceMatrixService = new google.maps.DistanceMatrixService();

        placesService.findPlaceFromQuery({
          query: OFFICE_ADDRESS,
          fields: ['place_id', 'geometry', 'formatted_address']
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
            setOfficePlace(results[0]);
            const marker = createMarker(
              results[0].geometry?.location!,
              'A',
              'Office'
            );
            markersRef.current.push(marker);
          }
        });

        setMap(mapInstance);
        setDirectionsService(directionsServiceInstance);
        setDistanceMatrix(distanceMatrixService);
        setLoadError(null);
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoadError('Failed to initialize map. Please refresh the page.');
      }
    };

    initializeMap();

    return () => {
      directionsRenderers.forEach(renderer => renderer.setMap(null));
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, [mapRef.current]);

  const calculateTrafficTime = async (
    origin: string | google.maps.LatLng | google.maps.Place | { placeId: string },
    destination: string | google.maps.LatLng | google.maps.Place | { placeId: string },
    departureTime?: Date
  ) => {
    if (!distanceMatrix) return null;

    try {
      const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
        distanceMatrix.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime: departureTime || new Date(),
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
          },
          (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(status);
            }
          }
        );
      });

      const element = response.rows[0]?.elements[0];
      return element?.duration_in_traffic?.text || element?.duration?.text;
    } catch (error) {
      console.error('Error calculating traffic time:', error);
      return null;
    }
  };

  const togglePredictiveTraffic = async (segmentIndex: number, enabled: boolean) => {
    const newSegments = [...segments];
    const segment = newSegments[segmentIndex];
    
    if (!segment.predictedTime) {
      segment.predictedTime = { enabled: false };
    }
    segment.predictedTime.enabled = enabled;
    
    if (!enabled) {
      delete segment.predictedTime.dateTime;
      delete segment.predictedTime.duration;
    } else {
      // Set default to current time + 1 hour
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      segment.predictedTime.dateTime = defaultTime;
      
      // Calculate initial prediction
      await updatePredictedTime(segmentIndex, defaultTime);
    }
    
    setSegments(newSegments);
  };

  const updatePredictedTime = async (segmentIndex: number, dateTime: Date) => {
    const newSegments = [...segments];
    const segment = newSegments[segmentIndex];
    segment.predictedTime!.dateTime = dateTime;
    
    let origin: any = segmentIndex === 0 ? 
      (officePlace?.geometry?.location || OFFICE_ADDRESS) : 
      (stops[segmentIndex - 1].placeId ? { placeId: stops[segmentIndex - 1].placeId } : stops[segmentIndex - 1].address);
    
    let destination: any = segmentIndex === segments.length - 1 ? 
      (officePlace?.geometry?.location || OFFICE_ADDRESS) : 
      (stops[segmentIndex].placeId ? { placeId: stops[segmentIndex].placeId } : stops[segmentIndex].address);

    const trafficTime = await calculateTrafficTime(origin, destination, dateTime);
    if (trafficTime) {
      segment.predictedTime!.duration = trafficTime;
    }
    
    setSegments(newSegments);
  };

  const createMarker = (position: google.maps.LatLng, label: string, title: string) => {
    const marker = new google.maps.Marker({
      position,
      map,
      label,
      title,
      animation: google.maps.Animation.DROP,
    });

    marker.addListener('click', () => {
      setStreetViewInfo({
        isOpen: true,
        position,
        address: title,
        label,
      });
    });

    return marker;
  };

  const addStop = () => {
    setStops(current => [
      ...current,
      { id: String(current.length + 1), address: '' }
    ]);
  };

  const removeStop = (id: string) => {
    setStops(current => current.filter(stop => stop.id !== id));
  };

  const updateStop = (id: string, address: string, placeId?: string) => {
    setStops(current =>
      current.map(stop =>
        stop.id === id ? { ...stop, address, placeId } : stop
      )
    );
  };

  const clearRoute = () => {
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    setDirectionsRenderers([]);
    setSegments([]);
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (map && officePlace) {
      const marker = createMarker(
        officePlace.geometry?.location!,
        'A',
        'Office'
      );
      markersRef.current.push(marker);
    }
  };

  const calculateRoute = async () => {
    if (!directionsService || !map || !officePlace) {
      alert('Map is not fully loaded yet. Please try again in a moment.');
      return;
    }
    
    setIsLoading(true);
    clearRoute();

    const validStops = stops.filter(stop => stop.address.trim());
    if (validStops.length === 0) {
      alert('Please add at least one stop');
      setIsLoading(false);
      return;
    }

    const routePoints = [
      { placeId: officePlace.place_id },
      ...validStops.map(stop => ({ placeId: stop.placeId || undefined, address: stop.address })),
      { placeId: officePlace.place_id }
    ];

    const newSegments: RouteSegment[] = [];
    const newRenderers: google.maps.DirectionsRenderer[] = [];

    try {
      for (let i = 0; i < routePoints.length - 1; i++) {
        const renderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: ROUTE_COLORS[i % ROUTE_COLORS.length],
            strokeWeight: 5
          }
        });
        
        const request: google.maps.DirectionsRequest = {
          travelMode: google.maps.TravelMode.DRIVING,
        };

        if (routePoints[i].placeId) {
          request.origin = { placeId: routePoints[i].placeId };
        } else {
          request.origin = routePoints[i].address;
        }

        if (routePoints[i + 1].placeId) {
          request.destination = { placeId: routePoints[i + 1].placeId };
        } else {
          request.destination = routePoints[i + 1].address;
        }

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              reject(status);
            }
          });
        });

        renderer.setDirections(result);
        newRenderers.push(renderer);

        if (result.routes[0]?.legs[0]) {
          if (i === 0) {
            const startMarker = createMarker(
              result.routes[0].legs[0].start_location,
              'A',
              'Start: Office'
            );
            markersRef.current.push(startMarker);
          }

          const endMarker = createMarker(
            result.routes[0].legs[0].end_location,
            i === routePoints.length - 2 ? String.fromCharCode(65 + validStops.length + 1) : String.fromCharCode(66 + i),
            i === routePoints.length - 2 ? 'End: Office' : `Stop ${String.fromCharCode(66 + i)}`
          );
          markersRef.current.push(endMarker);

          const segment: RouteSegment = {
            from: routePoints[i].placeId ? officePlace.formatted_address! : routePoints[i].address!,
            to: routePoints[i + 1].placeId ? officePlace.formatted_address! : routePoints[i + 1].address!,
            distance: result.routes[0].legs[0].distance?.text || 'N/A',
            duration: result.routes[0].legs[0].duration?.text || 'N/A',
            color: ROUTE_COLORS[i % ROUTE_COLORS.length]
          };

          const trafficTime = await calculateTrafficTime(
            i === 0 ? officePlace.geometry!.location : routePoints[i].placeId ? { placeId: routePoints[i].placeId } : routePoints[i].address,
            i === routePoints.length - 2 ? officePlace.geometry!.location : routePoints[i + 1].placeId ? { placeId: routePoints[i + 1].placeId } : routePoints[i + 1].address
          );
          
          if (trafficTime) {
            segment.trafficDuration = trafficTime;
          }

          newSegments.push(segment);
        }
      }

      setDirectionsRenderers(newRenderers);
      setSegments(newSegments);
    } catch (error) {
      console.error('Route calculation error:', error);
      alert('Error calculating route. Please check addresses and try again.');
      clearRoute();
    }

    setIsLoading(false);
  };

  const setupAutocomplete = (input: HTMLInputElement, stopId: string) => {
    if (!input || autocompleteRefs.current[stopId] || !window.google?.maps) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['place_id', 'formatted_address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address && place.place_id) {
        updateStop(stopId, place.formatted_address, place.place_id);
      }
    });

    autocompleteRefs.current[stopId] = autocomplete;
  };

  const TrafficTimeControl = ({ segment, index }: { segment: RouteSegment; index: number }) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string>(() => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(() => {
      return new Date().getHours() >= 12 ? 'PM' : 'AM';
    });

    const formatDateTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${date.toLocaleDateString()} at ${displayHours}:${minutes} ${period}`;
    };

    const handleDateTimeChange = async (date: string, time: string = selectedTime, period: 'AM' | 'PM' = selectedPeriod) => {
      const [hours, minutes] = time.split(':');
      const dateObj = new Date(date);
      let hour = parseInt(hours);
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      dateObj.setHours(hour, parseInt(minutes));
      await updatePredictedTime(index, dateObj);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      setSelectedTime(newTime);
      if (segment.predictedTime?.dateTime) {
        handleDateTimeChange(
          segment.predictedTime.dateTime.toISOString().split('T')[0],
          newTime,
          selectedPeriod
        );
      }
    };

    const handlePeriodChange = (period: 'AM' | 'PM') => {
      setSelectedPeriod(period);
      if (segment.predictedTime?.dateTime) {
        handleDateTimeChange(
          segment.predictedTime.dateTime.toISOString().split('T')[0],
          selectedTime,
          period
        );
      }
    };

    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-gray-500" />
          <span className="text-gray-700">
            Current traffic: {segment.trafficDuration || 'N/A'}
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => togglePredictiveTraffic(index, !segment.predictedTime?.enabled)}
              className="relative inline-flex items-center gap-2"
              role="switch"
              aria-checked={segment.predictedTime?.enabled}
            >
              <div
                className={`w-9 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                  segment.predictedTime?.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                    segment.predictedTime?.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm font-medium">
                Exact Time
              </span>
            </button>
          </div>
          
          {segment.predictedTime?.enabled && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="text-sm px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-2"
              >
                <CalendarDays size={16} />
                {segment.predictedTime.dateTime 
                  ? formatDateTime(segment.predictedTime.dateTime)
                  : 'Select time'}
              </button>
              
              {isDatePickerOpen && (
                <div className="relative">
                  <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border p-4">
                    <input
                      type="date"
                      className="w-full mb-4 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleDateTimeChange(e.target.value)}
                      value={segment.predictedTime.dateTime?.toISOString().split('T')[0] || ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedTime}
                        onChange={handleTimeChange}
                        onBlur={(e) => e.stopPropagation()}
                      />
                      <div className="flex rounded-md overflow-hidden border">
                        {(['AM', 'PM'] as const).map((period) => (
                          <button
                            key={period}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePeriodChange(period);
                            }}
                            className={`px-3 py-2 text-sm font-medium ${
                              selectedPeriod === period
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {segment.predictedTime?.enabled && segment.predictedTime.duration && (
          <div className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <Clock size={16} />
            Predicted time: {segment.predictedTime.duration}
          </div>
        )}
      </div>
    );
  };

  const StreetViewOverlay = () => {
    if (!streetViewInfo?.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <span className="font-medium">Street View</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Stop {streetViewInfo.label}
              </span>
            </div>
            <button
              onClick={() => setStreetViewInfo(null)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div ref={streetViewRef} className="w-full h-[500px]" />
          <div className="p-4 bg-gray-50 text-sm text-gray-600">
            {streetViewInfo.address}
          </div>
        </div>
      </div>
    );
  };

  const layoutStyles = {
    desktop: 'flex-row',
    tablet: 'flex-col',
    phone: 'flex-col'
  };

  const mapStyles = {
    desktop: 'w-3/4 h-[700px]',
    tablet: 'w-full h-[500px]',
    phone: 'w-full h-[400px]'
  };

  const panelStyles = {
    desktop: 'w-1/4',
    tablet: 'w-full',
    phone: 'w-full'
  };

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <StreetViewOverlay />
      <div className={`flex ${layoutStyles[viewMode]} gap-6`}>
        <div className={`${mapStyles[viewMode]} order-2 ${viewMode === 'desktop' ? 'order-1' : ''}`}>
          <div
            ref={mapRef}
            className="w-full h-full rounded-lg shadow-md"
          />
        </div>

        <div className={`${panelStyles[viewMode]} order-1 ${viewMode === 'desktop' ? 'order-2' : ''} bg-white rounded-lg shadow-md p-4`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Route Details</h2>
            <button
              onClick={clearRoute}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
              title="Reset Route"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-md">
              <label className="block text-sm font-medium text-blue-800 mb-1">
                Start: Office (A)
              </label>
              <div className="text-blue-600 text-sm">{officePlace?.formatted_address || OFFICE_ADDRESS}</div>
            </div>

            {stops.map((stop, index) => (
              <div key={stop.id} className="space-y-2">
                {segments[index] && (
                  <div className="py-2 px-3 bg-gray-50 rounded-md border-l-4" style={{ borderColor: segments[index].color }}>
                    <div className="text-sm">
                      <span className="font-medium">{segments[index].distance}</span>
                      <span className="mx-2">•</span>
                      <span className="text-gray-600">{segments[index].duration}</span>
                    </div>
                    <TrafficTimeControl segment={segments[index]} index={index} />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Stop {String.fromCharCode(66 + index)}
                    </label>
                    <input
                      type="text"
                      value={stop.address}
                      onChange={(e) => updateStop(stop.id, e.target.value)}
                      placeholder="Enter address"
                      className="w-full p-2 border rounded-md"
                      ref={(input) => {
                        if (input) setupAutocomplete(input, stop.id);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeStop(stop.id)}
                    className="self-end p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                    title="Remove Stop"
                    disabled={stops.length === 1}
                  >
                    <Minus size={20} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addStop}
              className="w-full p-2 text-blue-600 hover:text-blue-800 rounded-md border-2 border-dashed border-blue-200 hover:border-blue-300 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Stop
            </button>

            {segments.length > 0 && (
              <div className="space-y-2">
                <div className="py-2 px-3 bg-gray-50 rounded-md border-l-4" style={{ borderColor: segments[segments.length - 1]?.color }}>
                  <div className="text-sm">
                    <span className="font-medium">{segments[segments.length - 1]?.distance}</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-600">{segments[segments.length - 1]?.duration}</span>
                  </div>
                  <TrafficTimeControl segment={segments[segments.length - 1]} index={segments.length - 1} />
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    End: Office ({String.fromCharCode(65 + stops.length + 1)})
                  </label>
                  <div className="text-blue-600 text-sm">{officePlace?.formatted_address || OFFICE_ADDRESS}</div>
                </div>
              </div>
            )}

            <button
              onClick={calculateRoute}
              disabled={isLoading || stops.length === 0}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={20} />
                  Calculating...
                </span>
              ) : (
                'Calculate Route'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}