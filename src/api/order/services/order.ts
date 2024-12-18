/**
 * order service aggiornato usando strapi.document() con enumerazione State
 */

import { factories } from '@strapi/strapi';

// Definizione del tipo enumerazione per lo stato dell'ordine
// Se modifichi questo modifica anche schema.json
enum OrderState {
    New = 'New',
    Pending = 'Pending',
    InProgress = 'In Progress',
    Done = 'Done',
    Paid = 'Paid'
}

export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    // Controlla se l'ordine è modificabile
    async isEditable(orderID: string): Promise<boolean> {
        const order = await strapi.documents('api::order.order').findOne({ documentId: orderID });
        return order?.State === OrderState.New;
    },

    // Trova un ordine aperto associato a un tavolo
    async findOrderByTableID(tableID: string): Promise<string | false> {
        const order = await strapi.documents('api::order.order').findMany({
            filters: { table: { documentId: tableID }, State: OrderState.New },
            populate: ['table'],
            limit: 1
        });

        if (order.length > 0) {
            return order[0].documentId;
        }
        return false;
    },

    // Crea un nuovo ordine
    async createOrder(tableID: string, state: OrderState): Promise<string> {
        const order = await strapi.documents('api::order.order').create({
            data: {
                table: { documentId: tableID },
                State: state,
                Datetime: new Date().toISOString(),
            },
        });
        return order.documentId;
    },

    // Trova o crea un ordine
    async findOrCreateOrder(tableID: string): Promise<string> {
        const order = await this.findOrderByTableID(tableID);
        if (order !== false) {
            return order;
        }
        return await this.createOrder(tableID, OrderState.New);
    },
}));
