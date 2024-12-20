// Servizio per la gestione degli ordini totali
import { factories } from '@strapi/strapi';

// Enumerazione degli stati dell'ordine
enum OrderState {
    New = 'New',
    Pending = 'Pending',
    InProgress = 'In Progress',
    Done = 'Done',
    Paid = 'Paid'
}

export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    /**
     * Trova un ordine associato al tavolo
     * @param tableID - ID del tavolo
     * @returns ID dell'ordine o false se non esiste
     */
    async findOrderByTableID(tableID: string): Promise<string | false> {
        const order = await strapi.documents('api::order.order').findMany({
            filters: {
                table: { documentId: tableID },
                State: OrderState.New
            },
            limit: 1
        });

        return order.length > 0 ? order[0].documentId : false;
    },

    /**
     * Crea un nuovo ordine associato a un tavolo
     * @param tableID - documentId del tavolo
     * @param state - Stato iniziale dell'ordine
     * @returns ID dell'ordine creato
     */
    async createOrder(tableID: string, state: OrderState): Promise<string> {
        const order = await strapi.documents('api::order.order').create({
            data: {
                table: { documentId: tableID },
                State: state,
                Datetime: new Date().toISOString()
            }
        });

        console.log('Ordine totale creato:', order);
        return order.documentId;
    },


     /**
     * Conferma un ordine esistente cambiando lo stato da "New" a "Pending"
     * @param orderID - documentId dell'ordine totale da confermare
     */
    async confirmOrder(orderID: string): Promise<boolean> {
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID
        });

        if (!order || order.State !== OrderState.New) {
            throw new Error('Ordine non trovato o già confermato');
        }

        await strapi.documents('api::order.order').update({
            documentId: orderID,
            data: { State: OrderState.Pending }
        });

        return true;
    }

}));
