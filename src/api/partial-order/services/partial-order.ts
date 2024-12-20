// Servizio per la gestione degli ordini parziali
import { factories } from '@strapi/strapi';

// Enumerazione degli stati dell'ordine
enum OrderState {
    New = 'New',
    Pending = 'Pending',
    InProgress = 'In Progress',
    Done = 'Done',
    Paid = 'Paid'
}

export default factories.createCoreService('api::partial-order.partial-order', ({ strapi }) => ({

    /**
     * Crea un ordine parziale associando un ordine totale esistente o creandone uno nuovo
     * @param productID - documentId del prodotto
     * @param tableID - documentId del tavolo
     * @param users_permissions_user - documentId dell'utente registrato
     * @returns L'ordine parziale creato
     */
    async addPartialOrder(productID: string, tableID: string, users_permissions_user: string) {
        const orderService = strapi.service('api::order.order');
        let orderID;

        try {
            console.log('Verifica ordine totale esistente...');
            orderID = await orderService.findOrderByTableID(tableID);

            if (!orderID) {
                console.log('Creazione nuovo ordine totale...');
                orderID = await orderService.createOrder(tableID, OrderState.New);
                console.log('Nuovo ordine totale creato:', orderID);
            }

            const partialOrderData: Record<string, any> = {
                product: { documentId: productID },
                order: { documentId: orderID },
                users_permissions_user: { documentId: users_permissions_user }
            };

            console.log('Dati ordine parziale preparati:', partialOrderData);

            const partialOrder = await strapi.documents('api::partial-order.partial-order').create({
                data: partialOrderData
            });

            console.log('Ordine parziale creato:', partialOrder);

            await this.checkAndUpdateOrderState(orderID, tableID);

            return partialOrder;

        } catch (error) {
            console.error("Errore durante la creazione dell'ordine parziale: ", error);
            throw new Error('Errore del server');
        }
    },

    /**
     * Verifica se l'ordine deve passare allo stato "Pending"
     * @param orderID - documentId dell'ordine totale
     * @param tableID - documentId del tavolo
     */
    async checkAndUpdateOrderState(orderID: string, tableID: string): Promise<void> {
        console.log('Verifica stato ordine totale...');

        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID,
            populate: ['partial_orders']
        });

        const table = await strapi.documents('api::table.table').findOne({
            documentId: tableID
        });

        if (!order || !table) {
            console.error('Ordine o Tavolo non trovato');
            throw new Error('Ordine o Tavolo non trovato');
        }
    },
}));
