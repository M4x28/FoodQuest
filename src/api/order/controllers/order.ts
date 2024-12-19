/**
 * Controller per confermare l'ordine
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({

    async confirmOrder(ctx) {
        const { tableID, users_permissions_user } = ctx.request.body.data;

        // Verifica che il tavolo sia specificato
        if (!tableID) {
            return ctx.badRequest('ID del tavolo mancante');
        }

        try {
            // Trova l'ordine associato al tavolo e, se presente, all'utente
            const filters: any = {
                table: { documentId: tableID },
                State: 'New'
            };

            if (users_permissions_user) {
                filters.users_permissions_user = { documentId: users_permissions_user };
            }

            const order = await strapi.documents('api::order.order').findMany({
                filters,
                limit: 1
            });

            if (order.length === 0) {
                return ctx.notFound('Ordine non trovato');
            }

            // Aggiorna lo stato dell'ordine a 'Pending'
            const updatedOrder = await strapi.documents('api::order.order').update({
                documentId: order[0].documentId,
                data: { State: 'Pending' },
            });

            return ctx.send({ message: 'Ordine confermato con successo', data: updatedOrder });
        } catch (error) {
            strapi.log.error('Errore durante la conferma dell ordine: ', error);
            return ctx.internalServerError('Errore del server');
        }
    },

}));
