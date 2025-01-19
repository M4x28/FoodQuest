export default {
    routes: [
        {
            method: 'POST',
            path: '/fidelity-card/add-points',
            handler: 'fidelity-card.addFidelityPoints',
        },
        {
            method: 'POST',
            path: '/fidelity-card/calculate-table-discount',
            handler: 'fidelity-card.calculateTableDiscount',
        },
        {
            method: 'POST',
            path: '/fidelity-card/reset-points',
            handler: 'fidelity-card.resetPoints',
        },
        {
            method: 'POST',
            path: '/fidelity-card/create',
            handler: 'fidelity-card.createFidelityCard',
        },
        {
            method: 'DELETE',
            path: '/fidelity-card/delete',
            handler: 'fidelity-card.deleteFidelityCard',
        },
        {
            method: 'PUT',
            path: '/fidelity-card/use-points',
            handler: 'fidelity-card.updateUsePoints',
        },
        {
            method: 'GET',
            path: '/fidelity-card/:users_permissions_user',
            handler: 'fidelity-card.getFidelityCard',
        },
    ],
};