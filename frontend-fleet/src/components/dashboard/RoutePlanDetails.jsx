import { Typography } from '@mui/material';

export default function RoutePlanDetails({ route }) {
    const stops = route.chargingStops ?? [];

    return (
        <>
            <Typography variant="body2"><b>Pojazd:</b> {route.vehicleRegistrationNumber}</Typography>
            <Typography variant="body2"><b>Dystans:</b> {route.distanceKm?.toFixed(1)} km</Typography>
            <Typography variant="body2"><b>Temperatura:</b> {route.temperatureC?.toFixed(1)}°C</Typography>
            <Typography variant="body2"><b>Zużycie:</b> {route.consumptionKWhPerKm?.toFixed(2)} kWh/km</Typography>
            <Typography variant="body2"><b>Energia:</b> {route.energyRequiredKWh?.toFixed(1)} kWh</Typography>
            <Typography variant="body2"><b>Postoje ładowania:</b> {stops.length || 'brak, wystarczy baterii na powrót'}</Typography>
            {stops.map((stop, index) => (
                <Typography key={`${stop.name}-${index}`} variant="body2">
                    {index + 1}. {stop.name}: {stop.chargeKWh.toFixed(1)} kWh, ok. {Math.ceil(stop.chargingMinutes)} min
                </Typography>
            ))}
        </>
    );
}
