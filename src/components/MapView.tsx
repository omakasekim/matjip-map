import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { BasemapStyle, MapBounds, Place, getCategoryMeta } from '../types';

interface MapViewProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  basemap: BasemapStyle;
  fitTrigger: number;
  userLocation: { lat: number; lng: number } | null;
  visible: boolean;
}

const TILE_CONFIG: Record<BasemapStyle, { url: string; attribution: string; maxZoom: number }> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  },
};

function createPinIcon(place: Place, isSelected: boolean): L.DivIcon {
  const meta = getCategoryMeta(place.mc);
  return L.divIcon({
    className: isSelected ? 'matjip-pin-selected' : '',
    html: `<div class="matjip-pin-wrap"><div class="matjip-pin" style="background:${meta.color}"><span class="matjip-pin-inner">${meta.emoji}</span></div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const MapView: React.FC<MapViewProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  onBoundsChange,
  basemap,
  fitTrigger,
  userLocation,
  visible,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersByIdRef = useRef<Map<number, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const prevSelectedIdRef = useRef<number | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [36.55, 127.75],
      zoom: 7,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cfg = TILE_CONFIG[basemap];
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 20 ? 36 : count < 100 ? 44 : 52;
        const tier = count < 20 ? 'matjip-cluster-sm' : count < 100 ? 'matjip-cluster-md' : 'matjip-cluster-lg';
        return L.divIcon({
          html: `<div class="matjip-cluster ${tier}" style="width:${size}px;height:${size}px">${count}</div>`,
          className: '',
          iconSize: L.point(size, size),
        });
      },
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChange({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    };

    map.on('moveend zoomend', emitBounds);
    setTimeout(emitBounds, 150);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.off('moveend zoomend', emitBounds);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      tileRef.current = null;
      markersByIdRef.current.clear();
    };
  }, []);

  // Recompute map viewport when returning from list view or toggling sidebar
  useEffect(() => {
    if (!visible || !mapRef.current) return;
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize();
      if (selectedPlace) {
        mapRef.current?.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(mapRef.current.getZoom(), 15), {
          duration: 0.5,
        });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [visible]);

  // Switch basemap tiles dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) {
      map.removeLayer(tileRef.current);
    }
    const cfg = TILE_CONFIG[basemap];
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  }, [basemap]);

  // Sync filtered places into marker cluster layer
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    markersByIdRef.current.clear();

    const newMarkers: L.Marker[] = [];
    for (const p of places) {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
      const isSelected = selectedPlace?.i === p.i;
      const marker = L.marker([p.lat, p.lng], {
        icon: createPinIcon(p, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindTooltip(`${p.n} · ${p.c}`, {
        direction: 'top',
        offset: [0, -32],
        className: 'matjip-tooltip',
      });

      marker.on('click', () => {
        onSelectPlace(p);
      });

      markersByIdRef.current.set(p.i, marker);
      newMarkers.push(marker);
    }

    cluster.addLayers(newMarkers);
    prevSelectedIdRef.current = selectedPlace?.i ?? null;
  }, [places]);

  // Update selected marker highlight & flyTo smoothly
  useEffect(() => {
    const map = mapRef.current;
    const prevId = prevSelectedIdRef.current;

    if (prevId !== null && prevId !== selectedPlace?.i) {
      const prevMarker = markersByIdRef.current.get(prevId);
      const prevPlace = places.find((x) => x.i === prevId);
      if (prevMarker && prevPlace) {
        prevMarker.setIcon(createPinIcon(prevPlace, false));
        prevMarker.setZIndexOffset(0);
      }
    }

    if (selectedPlace) {
      const marker = markersByIdRef.current.get(selectedPlace.i);
      if (marker) {
        marker.setIcon(createPinIcon(selectedPlace, true));
        marker.setZIndexOffset(1000);
      }
      if (map) {
        const targetZoom = Math.max(map.getZoom(), 15);
        map.flyTo([selectedPlace.lat, selectedPlace.lng], targetZoom, {
          duration: 0.65,
        });
      }
    }

    prevSelectedIdRef.current = selectedPlace?.i ?? null;
  }, [selectedPlace]);

  // Fit bounds when user triggers filter fit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitTrigger === 0 || places.length === 0) return;

    if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], 15, { duration: 0.6 });
      return;
    }

    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true });
    }
  }, [fitTrigger]);

  // Render user GPS location pulse dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1,
      })
        .bindTooltip('내 현재 위치', { direction: 'top', className: 'matjip-tooltip' })
        .addTo(map);
      map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 0.7 });
    }
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${basemap !== 'dark' ? 'light-map' : ''}`}
    />
  );
};
