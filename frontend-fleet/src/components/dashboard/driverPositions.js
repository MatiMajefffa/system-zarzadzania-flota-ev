import { useEffect, useState } from 'react';

export const getPhaseLabel = (position) => ({
    DO_CELU: 'W drodze do celu',
    LADOWANIE: `Ładowanie: ${position.stationName}`,
    NA_MIEJSCU: 'Na miejscu',
    POWROT: 'Powrót do bazy',
    W_BAZIE: 'W bazie, oczekuje na zwrot auta'
}[position.phase]);

export function useDriverPositions() {
    const [positions, setPositions] = useState([]);

    useEffect(() => {
        const fetchPositions = async () => {
            try {
                const response = await fetch('/api/routes/positions', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.ok) setPositions(await response.json());
            } catch (err) {
                console.error(err);
            }
        };
        fetchPositions();
        const intervalId = setInterval(fetchPositions, 5000);
        return () => clearInterval(intervalId);
    }, []);

    return positions;
}
