/**
 * Controller per confermare l'ordine
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({

    async confirmOrder(ctx) {
        const { orderID } = ctx.request.body.data;

        // Verifica che il tavolo sia specificato
        if (!orderID) {
            return ctx.badRequest('ID dell\'ordine mancante');
        }

        try {
            const order = await strapi.documents('api::order.order').findOne({
                documentId: orderID
            });

            if (order.documentId !== orderID) {
                return ctx.notFound('Ordine non trovato');
            }

            // Aggiorna lo stato dell'ordine a 'Pending'
            const orderService = strapi.service('api::order.order');
            const orderReturn = await orderService.confirmOrder(order.documentId);

            return ctx.send({ message: 'Ordine confermato con successo', data: orderReturn });
        } catch (error) {
            strapi.log.error('Errore durante la conferma dell ordine: ', error);
            return ctx.internalServerError('Errore del server');
        }
    },

}));
