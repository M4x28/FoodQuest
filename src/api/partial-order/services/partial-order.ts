/**
 * partial-order service
 */

import { factories } from '@strapi/strapi';

// Service di Partial-Order
export default factories.createCoreService('api::partial-order.partial-order', ({ strapi }) => ({

    async addPartialOrder(productID: string, users_permissions_user: string, tableID: string) {
        // Trova o crea l'ordine
        const orderService = strapi.service('api::order.order');
        const orderID = await orderService.findOrCreateOrder(tableID);

        // Crea un nuovo ordine parziale associandolo all'ordine trovato o creato
        const partialOrder = await strapi.documents('api::partial-order.partial-order').create({
            data: {
                product: { documentId: productID },
                order: { documentId: orderID },
                users_permissions_user: { documentId: users_permissions_user },
                State: 'Pending',
            },
        });
        return partialOrder;
    },

}));

