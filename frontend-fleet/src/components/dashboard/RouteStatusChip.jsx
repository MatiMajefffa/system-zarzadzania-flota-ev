import { Chip } from '@mui/material';

export default function RouteStatusChip({ route }) {
    if (route.status === 'ZLECONA') return <Chip size="small" color="warning" label="Oczekuje na rozpoczęcie" />;
    if (route.arrivedAt) return <Chip size="small" color="info" label="Powrót do bazy" />;
    return <Chip size="small" color="success" label="W trasie" />;
}