// Controller per la gestione degli ordini parziali
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::partial-order.partial-order', ({ strapi }) => ({

    /**
     * Crea un nuovo ordine parziale.
     * 
     * @param {object} ctx - Contesto della richiesta, contenente i dati dell'ordine.
     * @returns {object} Risposta con messaggio di successo e dati dell'ordine parziale creato, oppure un messaggio di errore.
     * @throws {InternalServerError} Se si verifica un errore durante la creazione dell'ordine.
     */
    async create(ctx) {
        try {
            console.log("Hi1");

            // Estrae i dati dal corpo della richiesta
            const { productID, users_permissions_user, accessCode, sessionCode } = ctx.request.body.data;
            console.log(JSON.stringify(ctx.request.body, null, 3));

            // Verifica la presenza dei dati obbligatori nella richiesta
            if (!productID || !accessCode || !sessionCode) {
                return ctx.badRequest('Richiesta non valida, dati mancanti');
            }

            // Verifica e recupera il documentId del tavolo usando il servizio del tavolo
            const tableService = strapi.service('api::table.table');
            const tableID = await tableService.verify(accessCode, sessionCode);

            console.log("Hi2");

            // Se il tavolo è valido, crea l'ordine parziale
            if (tableID !== null) {
                const partialOrderService = strapi.service('api::partial-order.partial-order');
                const partialOrder = await partialOrderService.addPartialOrder(productID, tableID, users_permissions_user);

                return ctx.created({ message: 'Ordine parziale creato con successo', data: partialOrder });
            }

            // Se il tavolo non è valido, restituisce un messaggio di errore
            return ctx.created({ message: 'Ordine parziale non creato' });
        } catch (error) {
            console.error('Errore durante la creazione dell ordine parziale: ', error);

            // Gestisce errori del server durante la creazione dell'ordine parziale
            return ctx.internalServerError('Errore del server durante la creazione dell ordine parziale');
        }
    }

}));