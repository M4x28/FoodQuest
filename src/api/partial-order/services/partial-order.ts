// Servizio per la gestione degli ordini parziali
import { factories } from '@strapi/strapi';

// Enumerazione degli stati dell'ordine
enum OrderState {
    New = 'New',                // Ordine appena creato
    Pending = 'Pending',        // Ordine in attesa
    InProgress = 'In Progress', // Ordine in preparazione
    Done = 'Done',              // Ordine completato
    Paid = 'Paid'               // Ordine pagato
}

export default factories.createCoreService('api::partial-order.partial-order', ({ strapi }) => ({

    /**
     * Crea un ordine parziale associando un ordine totale esistente o creandone uno nuovo.
     * 
     * @param {string} productID - ID del prodotto.
     * @param {string} tableID - ID del tavolo.
     * @param {string} users_permissions_user - ID dell'utente registrato.
     * @returns {Promise<object>} L'ordine parziale creato.
     * @throws {Error} Se si verifica un errore durante la creazione dell'ordine.
     */
    async addPartialOrder(productID: string, tableID: string, users_permissions_user: string) {
        const orderService = strapi.service('api::order.order');
        let orderID;

        try {
            console.log('Verifica ordine totale esistente...');
            // Cerca un ordine totale esistente associato al tavolo
            orderID = await orderService.findOrderByTableID(tableID);

            if (!orderID) {
                // Se non esiste un ordine totale, ne crea uno nuovo
                console.log('Creazione nuovo ordine totale...');
                orderID = await orderService.createOrder(tableID, OrderState.New);
                console.log('Nuovo ordine totale creato:', orderID);
            }

            let partialOrderData;

            // Prepara i dati per l'ordine parziale
            if (users_permissions_user) {
                partialOrderData = {
                    product: { documentId: productID },
                    order: { documentId: orderID },
                    users_permissions_user: { documentId: users_permissions_user }
                };
            } else {
                partialOrderData = {
                    product: { documentId: productID },
                    order: { documentId: orderID },
                };
            }

            console.log('Dati ordine parziale preparati:', partialOrderData);

            // Crea l'ordine parziale nel database
            const partialOrder = await strapi.documents('api::partial-order.partial-order').create({
                data: partialOrderData
            });

            // Forza l'aggiornamento dell'ordine totale per aggiornare il timestamp
            strapi.documents("api::order.order").update({
                documentId: orderID,
                data: {
                    updatedAt: new Date().toISOString(),
                }
            });

            console.log('Ordine parziale creato:', partialOrder);

            // Controlla e aggiorna lo stato dell'ordine totale se necessario
            await this.checkAndUpdateOrderState(orderID, tableID);

            return partialOrder;

        } catch (error) {
            console.error("Errore durante la creazione dell'ordine parziale: ", error);
            throw new Error('Errore del server');
        }
    },

    /**
     * Verifica se l'ordine totale associato deve cambiare stato a "Pending".
     * 
     * @param {string} orderID - ID dell'ordine totale.
     * @param {string} tableID - ID del tavolo.
     * @returns {Promise<void>}
     * @throws {Error} Se l'ordine o il tavolo non vengono trovati.
     */
    async checkAndUpdateOrderState(orderID: string, tableID: string): Promise<void> {
        console.log('Verifica stato ordine totale...');

        // Recupera l'ordine totale con gli ordini parziali associati
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID,
            populate: ['partial_orders']
        });

        // Recupera i dettagli del tavolo
        const table = await strapi.documents('api::table.table').findOne({
            documentId: tableID
        });

        // Se l'ordine o il tavolo non esistono, solleva un errore
        if (!order || !table) {
            console.error('Ordine o Tavolo non trovato');
            throw new Error('Ordine o Tavolo non trovato');
        }
    },
}));