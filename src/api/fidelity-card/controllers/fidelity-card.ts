// Controller per la gestione della Fidelity Card
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::fidelity-card.fidelity-card', ({ strapi }) => ({

    async create(ctx) {
        const { users_permissions_user, productID } = ctx.request.body.data;

        if (!users_permissions_user || !productID) {
            return ctx.badRequest('ID utente o prodotto mancante');
        }

        try {
            console.log(`Aggiornamento punti fedeltà per utente: ${users_permissions_user}, prodotto: ${productID}`);

            // Aggiorna i punti fedeltà utilizzando il servizio
            const fidelityCardService = strapi.service('api::fidelity-card.fidelity-card');
            const points = await fidelityCardService.updateFidelityPoints(users_permissions_user, productID);

            return ctx.send({ message: `Punti ottenuti: ${points}.` });
        } catch (error) {
            console.error('Errore durante l aggiornamento dei punti fedeltà: ', error);
            return ctx.internalServerError('Errore durante l aggiornamento dei punti fedeltà');
        }
    }

}));
