/**
 * table controller
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError, UnauthorizedError } = errors;

export default factories.createCoreController('api::table.table', (({ strapi }) => ({

    async accessTable(ctx) {

        if (!ctx.params || !ctx.params.accessCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const { accessCode } = ctx.params;

        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table || table.CheckRequest) {
            throw new UnauthorizedError("No valid table found");
        }

        return {
            data: {
                number: table.Number,
                sessionCode: table.SessionCode,
            }
        };
    },

    async tableStatus(ctx) {

        const { accessCode,sessionCode } = ctx.request.body.data;

            // Verifica che il tavolo sia specificato
        if (!accessCode || !sessionCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table) {
            throw new UnauthorizedError("No valid table found");
        }

        if(table.SessionCode != sessionCode ){
            return "EXPIRED";
        }else if(table.CheckRequest){
            return "CHECK";
        }else{
            return "OK";
        }
    },

    /**
     * Verifica l'esistenza di un tavolo e la presenza di almeno un ordine associato
     */
    async checkRequest(ctx) {
        try {
            const { accessCode,sessionCode } = ctx.request.body.data;

            // Verifica che il tavolo sia specificato
            if (!accessCode || !sessionCode) {
                return ctx.badRequest('Dettagli del tavolo mancanti');
            }

            // Verifica che il tavolo esista
            const tableService = strapi.service('api::table.table');
            const tableID = await tableService.verify(accessCode,sessionCode);
            
            if (!tableID) {
                return ctx.notFound('Tavolo non trovato');
            }

            // Conta gli ordini associati al tavolo
            const ordersCount = await strapi.documents('api::order.order').count({
                filters: {
                    table: { 
                        documentId: tableID 
                    },
                    State: {
                        $not:"Paid"
                    }
                }
            });

            if (ordersCount === 0) {
                return ctx.badRequest('Nessun ordine associato al tavolo');
            }

            // Richiama il service appropriato per la richiesta
            await tableService.checkRequest(tableID);

            return ctx.send({ message: `Richiesta per il tavolo ${tableID} elaborata con successo.` });
        } catch (error) {
            console.error('Errore durante la verifica della richiesta:', error);
            return ctx.internalServerError('Errore durante la verifica della richiesta');
        }
    }



})
));
