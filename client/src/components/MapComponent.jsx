import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaCar } from "react-icons/fa";
import { renderToString } from 'react-dom/server';

// Fix for default marker icons in Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Create a custom car icon using Leaflet.divIcon
const carIconHtml = renderToString(
  <div style={{ 
    color: '#0f766e', 
    fontSize: '24px', 
    backgroundColor: 'white', 
    borderRadius: '50%', 
    padding: '4px',
    boxShadow: '0 8px 18px rgba(15,23,42,0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <FaCar />
  </div>
);

const carIcon = L.divIcon({
  html: carIconHtml,
  className: 'custom-car-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function ChangeView({ center, zoom, route, autoFit = true }) {
  const map = useMap();

  useEffect(() => {
    if (!autoFit) {
      return;
    }

    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);

      map.fitBounds(bounds, {
        padding: [50, 50],
      });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, route, map, autoFit]);

  return null;
}

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function MapComponent({ center = [22.9734, 78.6569], zoom = 5, markers = [], route = [], onMapClick }) {
  const displayMarkers = markers;

  return (
    <MapContainer 
  center={center}
  zoom={zoom}
  style={{
    height: "100%",
    width: "100%",
    borderRadius: "8px"
  }}
  scrollWheelZoom={true}
  dragging={true}
  doubleClickZoom={true}
  touchZoom={true}
  boxZoom={false}
  keyboard={true}
>
<ChangeView
  center={center}
  zoom={zoom}
  route={route}
  autoFit={!onMapClick}
/>
      <MapEvents onMapClick={onMapClick} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Draw the route */}
      {route && route.length > 0 && (
        <Polyline 
          positions={route} 
          color="#0f766e" 
          weight={5} 
          opacity={0.7}
          lineJoin="round"
        />
      )}

      {displayMarkers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={marker.position} 
          icon={marker.type === 'live_car' ? carIcon : new L.Icon.Default()}
        >
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
