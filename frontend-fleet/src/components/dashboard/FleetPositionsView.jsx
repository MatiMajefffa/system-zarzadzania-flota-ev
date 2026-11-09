import React from 'react';
import { Box } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getPhaseLabel, useDriverPositions } from './driverPositions';

const normalizeBaseName = (name) => name.trim().toLowerCase().replace(/^baza\s+/, '');

const getDriverName = (driver) => (driver.firstName ? `${driver.firstName} ${driver.lastName}` : driver.email);

export default function FleetPositionsView({ vehicles, bases, activeRoutes, drivers, carIcon, baseIcon }) {
    const positions = useDriverPositions();

    const routes = positions.map((position) => activeRoutes.find((route) => route.id === position.routeId));
    const movingVehicleIds = new Set(routes.filter(Boolean).map((route) => route.vehicleId));

    const parkedByBase = bases.map((base) => ({
        base,
        vehicles: vehicles.filter((vehicle) => !movingVehicleIds.has(vehicle.id)
            && vehicle.currentBase && normalizeBaseName(vehicle.currentBase) === normalizeBaseName(base.name))
    })).filter((group) => group.vehicles.length > 0);

    return (
        <Box sx={{ height: 'calc(100vh - 112px)', minHeight: 500, borderRadius: 2, overflow: 'hidden' }}>
            <MapContainer center={[50.27, 19.02]} zoom={9} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {parkedByBase.map(({ base, vehicles: parked }) => (
                    <Marker key={`base-${base.id}`} position={[base.latitude, base.longitude]} icon={baseIcon}>
                        <Popup>
                            <strong>{base.name}</strong><br />
                            {parked.map((vehicle) => (
                                <div key={vehicle.id}>{vehicle.registrationNumber}: {vehicle.stateOfCharge}%, {vehicle.isBlocked ? 'ZABLOKOWANY' : vehicle.status}</div>
                            ))}
                        </Popup>
                    </Marker>
                ))}

                {positions.map((position, index) => {
                    const route = routes[index];
                    const driver = route && drivers.find((candidate) => String(candidate.id) === String(route.employeeId));
                    return (
                        <Marker key={`route-${position.routeId}`} position={[position.latitude, position.longitude]} icon={carIcon}>
                            <Popup>
                                <strong>{route?.vehicleRegistrationNumber ?? `Trasa ${position.routeId}`}</strong><br />
                                {driver && <>Kierowca: {getDriverName(driver)}<br /></>}
                                {getPhaseLabel(position)}<br />
                                Postęp: {position.progressPercent}%
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </Box>
    );
}
