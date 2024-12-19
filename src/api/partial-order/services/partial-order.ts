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
     * @param productID - ID del prodotto
     * @param tableID - ID del tavolo
     * @param users_permissions_user - ID facoltativo dell'utente registrato
     * @returns L'ordine parziale creato
     */
    async addPartialOrder(productID: string, tableID: string, users_permissions_user?: string) {
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

            let guest = await strapi.documents('api::guest.guest').findMany({
                filters: {
                    SessionCode: { $eq: tableID }
                },
                limit: 1
            });

            if (guest.length === 0) {
                console.log('Creazione nuovo guest...');
                guest = [await strapi.documents('api::guest.guest').create({
                    data: { SessionCode: tableID }
                })];
                console.log('Nuovo guest creato:', guest[0]);
            }

            const partialOrderData: Record<string, any> = {
                product: { documentId: productID },
                order: { documentId: orderID },
            };

            if (users_permissions_user) {
                console.log('Verifica utente registrato:', users_permissions_user);
                const user = await strapi.documents('plugin::users-permissions.user').findOne({
                    documentId: users_permissions_user
                });

                if (!user) {
                    console.warn(`Utente non trovato, gestione come guest: ${users_permissions_user}`);
                    partialOrderData.guest = { documentId: guest[0].documentId };
                } else {
                    partialOrderData.users_permissions_user = { documentId: users_permissions_user };
                }
            } else {
                partialOrderData.guest = { documentId: guest[0].documentId };
            }

            console.log('Dati ordine parziale preparati:', partialOrderData);

            const partialOrder = await strapi.documents('api::partial-order.partial-order').create({
                data: partialOrderData
            });

            console.log('Ordine parziale creato:', partialOrder);

            await this.checkAndUpdateOrderState(orderID, tableID);

            return partialOrder;

        } catch (error) {
            console.error('Errore durante la creazione dellordine parziale: ', error);
            throw new Error('Errore del server');
        }
    },

    /**
     * Verifica se l'ordine deve passare allo stato "Pending"
     * @param orderID - ID dell'ordine totale
     * @param tableID - ID del tavolo
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

        const totalPartialOrders = order.partial_orders.length;
        const tableCovers = table.Covers || 0;

        console.log(`Ordini Parziali: ${totalPartialOrders} / Coperti: ${tableCovers}`);

        if (totalPartialOrders >= tableCovers && tableCovers > 0) {
            console.log('Aggiornamento ordine a "Pending"...');
            await strapi.documents('api::order.order').update({
                documentId: orderID,
                data: { State: OrderState.Pending }
            });
            console.log('Ordine aggiornato a "Pending".');
        }
    },
}));
