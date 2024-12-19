// Controller per la gestione degli ordini parziali
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::partial-order.partial-order', ({ strapi }) => ({

    async create(ctx) {
        try {
            const { productID, tableID, users_permissions_user } = ctx.request.body.data;

            if (!productID || !tableID) {
                return ctx.badRequest('ID del prodotto o del tavolo mancante');
            }

            console.log('Creazione ordine parziale con:', { productID, tableID, users_permissions_user });

            // Crea l'ordine parziale usando il servizio
            const partialOrderService = strapi.service('api::partial-order.partial-order');
            const partialOrder = await partialOrderService.addPartialOrder(productID, tableID, users_permissions_user);

            return ctx.created({ message: 'Ordine parziale creato con successo', data: partialOrder });
        } catch (error) {
            console.error('Errore durante la creazione dell ordine parziale: ', error);
            return ctx.internalServerError('Errore del server durante la creazione dellordine parziale');
        }
    }

}));
