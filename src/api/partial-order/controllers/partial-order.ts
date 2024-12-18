/**
 * partial-order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::partial-order.partial-order', ({ strapi }) => ({

    async create(ctx) {
        const { productID, users_permissions_user, tableID } = ctx.request.body.data;

        // Verifica che i campi obbligatori siano presenti
        const requiredFields = [productID, users_permissions_user, tableID];

        if (requiredFields.some(field => typeof field !== 'string' || !field.trim())) {
            return ctx.badRequest('Campi mancanti o non validi');
        }

        try {
            // Verifica che il prodotto esista
            const product = await strapi.documents('api::product.product').findOne({ documentId: productID });
            if (!product) {
                return ctx.notFound('Prodotto non trovato');
            }

            // Verifica che l'utente esista
            const user = await strapi.documents('plugin::users-permissions.user').findOne({ documentId: users_permissions_user });
            if (!user) {
                return ctx.notFound('Utente non trovato');
            }

            // Verifica che il tavolo esista
            const table = await strapi.documents('api::table.table').findOne({ documentId: tableID });
            if (!table) {
                return ctx.notFound('Tavolo non trovato');
            }

            // Elabora la richiesta tramite il service
            const partialOrderService = strapi.service('api::partial-order.partial-order');
            const partialOrder = await partialOrderService.addPartialOrder(productID, users_permissions_user, tableID);

            return ctx.created(partialOrder);
        } catch (error) {
            strapi.log.error("Errore durante la creazione dell'ordine parziale", error);
            return ctx.internalServerError('Errore del server');
        }
    },

}));
