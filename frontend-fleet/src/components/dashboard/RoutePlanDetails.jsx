import { Typography } from '@mui/material';

export default function RoutePlanDetails({ route }) {
    return (
        <>
            <Typography variant="body2"><b>Pojazd:</b> {route.vehicleRegistrationNumber}</Typography>
            <Typography variant="body2"><b>Dystans:</b> {route.distanceKm?.toFixed(1)} km</Typography>
            <Typography variant="body2"><b>Temperatura:</b> {route.temperatureC?.toFixed(1)}°C</Typography>
            <Typography variant="body2"><b>Zużycie:</b> {route.consumptionKWhPerKm?.toFixed(2)} kWh/km</Typography>
            <Typography variant="body2"><b>Energia:</b> {route.energyRequiredKWh?.toFixed(1)} kWh</Typography>
            {route.chargingStopMinutes != null && (
                <Typography variant="body2"><b>Ładowanie po drodze:</b> ok. {Math.ceil(route.chargingStopMinutes)} min</Typography>
            )}
        </>
    );
}
