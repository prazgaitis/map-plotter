import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  coordinates: Array<{
    latitude: number;
    longitude: number;
    label: string;
  }>;
  zoomToCoordinate: { latitude: number; longitude: number } | null;
  isExpanded: boolean; // Add this prop
}

const Map: React.FC<MapProps> = ({ coordinates, zoomToCoordinate, isExpanded }) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add new markers
    coordinates.forEach((coord) => {
      L.marker([coord.latitude, coord.longitude])
        .addTo(map)
        .bindPopup(coord.label);
    });

    // Zoom to fit all markers
    if (coordinates.length > 0) {
      const group = L.featureGroup(coordinates.map(coord => 
        L.marker([coord.latitude, coord.longitude])
      ));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    // Zoom to the specified coordinate if provided
    if (zoomToCoordinate) {
      map.setView([zoomToCoordinate.latitude, zoomToCoordinate.longitude], 10);
    }

    // Force a map resize
    setTimeout(() => {
      map.invalidateSize();
    }, 0);

  }, [coordinates, zoomToCoordinate, isExpanded]);

  // Change the inline style to use 100% width and height
  return <div id="map" style={{ width: '100%', height: '100%' }} />;
};

export default Map;