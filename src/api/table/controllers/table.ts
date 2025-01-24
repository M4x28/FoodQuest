/**
 * Controller per la gestione dei tavoli.
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError, UnauthorizedError } = errors;

export default factories.createCoreController('api::table.table', (({ strapi }) => ({

    /**
     * Accede a un tavolo utilizzando un codice di accesso.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Dettagli del tavolo, inclusi numero e sessionCode.
     * @throws {ApplicationError} Se manca il codice di accesso nella query.
     * @throws {UnauthorizedError} Se il tavolo non è valido o è già stato richiesto il conto.
     */
    async accessTable(ctx) {
        if (!ctx.params || !ctx.params.accessCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const { accessCode } = ctx.params;

        // Recupera il tavolo tramite il codice di accesso
        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table || table.CheckRequest) {
            throw new UnauthorizedError("No valid table found");
        }

        return {
            data: {
                number: table.Number,        // Numero del tavolo
                sessionCode: table.SessionCode, // Codice di sessione del tavolo
            }
        };
    },

    /**
     * Verifica lo stato di un tavolo specifico utilizzando codice di accesso e sessione.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {string} Stato del tavolo: "EXPIRED", "CHECK" o "OK".
     * @throws {ApplicationError} Se i parametri richiesti sono mancanti.
     * @throws {UnauthorizedError} Se il tavolo non è valido.
     */
    async tableStatus(ctx) {
        const { accessCode, sessionCode } = ctx.request.body.data;

        if (!accessCode || !sessionCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        // Recupera il tavolo tramite il codice di accesso
        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table) {
            throw new UnauthorizedError("No valid table found");
        }

        // Determina lo stato del tavolo
        if (table.SessionCode != sessionCode) {
            return "EXPIRED"; // Codice di sessione non valido
        } else if (table.CheckRequest) {
            return "CHECK"; // È stato richiesto il conto
        } else {
            return "OK"; // Tavolo attivo e valido
        }
    },

    /**
     * Verifica l'esistenza di un tavolo e la presenza di almeno un ordine associato.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Messaggio di conferma o errore.
     * @throws {ApplicationError} Se mancano i dettagli del tavolo.
     * @throws {NotFoundError} Se il tavolo non esiste.
     * @throws {BadRequestError} Se non ci sono ordini associati al tavolo.
     */
    async checkRequest(ctx) {
        try {
            const { accessCode, sessionCode } = ctx.request.body.data;

            if (!accessCode || !sessionCode) {
                return ctx.badRequest('Dettagli del tavolo mancanti');
            }

            // Verifica che il tavolo esista
            const tableService = strapi.service('api::table.table');
            const tableID = await tableService.verify(accessCode, sessionCode);

            if (!tableID) {
                return ctx.notFound('Tavolo non trovato');
            }

            // Conta gli ordini associati al tavolo che non sono stati pagati
            const ordersCount = await strapi.documents('api::order.order').count({
                filters: {
                    table: { documentId: tableID },
                    State: { $not: "Paid" }
                }
            });

            if (ordersCount === 0) {
                return ctx.badRequest('Nessun ordine associato al tavolo');
            }

            // Esegue la richiesta per il tavolo
            await tableService.checkRequest(tableID);

            return ctx.send({ message: `Richiesta per il tavolo ${tableID} elaborata con successo.` });
        } catch (error) {
            console.error('Errore durante la verifica della richiesta:', error);
            return ctx.internalServerError('Errore durante la verifica della richiesta');
        }
    },

    /**
     * Calcola il totale degli ordini effettuati da un tavolo, inclusi eventuali sconti.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Totale degli ordini e sconto applicato.
     * @throws {ApplicationError} Se manca il codice di accesso nella query.
     * @throws {UnauthorizedError} Se il tavolo non è valido.
     */
    async total(ctx) {
        if (!ctx.params || !ctx.params.accessCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const { accessCode } = ctx.params;

        // Recupera il tavolo tramite il codice di accesso
        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table) {
            throw new UnauthorizedError("No valid table found", "");
        }
        
        const total = await strapi.service("api::table.table").total(table.documentId)

        // Calcola lo sconto totale applicabile al tavolo
        const discount = await strapi.service("api::fidelity-card.fidelity-card").calculateTableDiscount(table.Number);

        return {
            data: {
                total,    // Totale degli ordini
                discount  // Sconto applicato
            }
        };
    }

})));