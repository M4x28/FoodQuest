/**
 * partial-order service aggiornato per supportare utenti guest e controllo stato ordine
 */

import { factories } from '@strapi/strapi';

// Definizione del tipo enumerazione per lo stato dell'ordine
enum OrderState {
    New = 'New',
    Pending = 'Pending',
    InProgress = 'In Progress',
    Done = 'Done',
    Paid = 'Paid'
}

export default factories.createCoreService('api::partial-order.partial-order', ({ strapi }) => ({

    async addPartialOrder(productID: string, tableID: string, users_permissions_user?: string) {
        // Trova o crea un ordine
        const orderService = strapi.service('api::order.order');
        let orderID;
        try {
            orderID = await orderService.findOrderByTableID(tableID);
        } catch {
            orderID = await orderService.createOrder(tableID, OrderState.New);
        }

        // Trova o crea un utente guest associato al tavolo
        let guest = await strapi.documents('api::guest.guest').findMany({
            filters: {
                SessionCode: {
                    $eq: tableID
                }
            },
            limit: 1
        });

        if (guest.length === 0) {
            guest = [await strapi.documents('api::guest.guest').create({
                data: {
                    SessionCode: tableID
                }
            })];
        }

        // Crea un ordine parziale
        const partialOrderData: any = {
            product: { documentId: productID },
            order: { documentId: orderID },
        };

        if (users_permissions_user) {
            partialOrderData.users_permissions_user = { documentId: users_permissions_user };
        } else {
            partialOrderData.guest = { documentId: guest[0].documentId };
        }

        const partialOrder = await strapi.documents('api::partial-order.partial-order').create({
            data: partialOrderData
        });

        // Controlla se aggiornare lo stato dell'ordine
        await this.checkAndUpdateOrderState(orderID, tableID);

        return partialOrder;
    },

    // Verifica e aggiorna lo stato dell'ordine se necessario
    async checkAndUpdateOrderState(orderID: string, tableID: string): Promise<void> {
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID,
            populate: ['partial_orders']
        });

        const table = await strapi.documents('api::table.table').findOne({
            documentId: tableID
        });

        if (!order || !table) {
            throw new Error('Ordine o Tavolo non trovato');
        }

        const totalPartialOrders = order.partial_orders.length;
        const tableCovers = table.Covers || 0;

        if (totalPartialOrders >= tableCovers && tableCovers > 0) {
            await strapi.documents('api::order.order').update({
                documentId: orderID,
                data: { State: OrderState.Pending }
            });
        }
    },
}));
