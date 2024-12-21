/**
 * table service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::table.table', (({ strapi }) => ({

    //Verify access to table with AccessCode <accessCode> and SessionCode <sessionCode>
    //Return Table number if found or null if not 
    async verify(accessCode: string, sessionCode: string): Promise<string | null> {

        const table = await strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode,
                SessionCode: sessionCode,
                CheckRequest: false,
            }
        });

        return table ? table.documentId : null;
    },

    //Get table info from the accessCode
    async getTable(accessCode: string) {
        return strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode,
            }
        });
    },

    /**
     * Imposta lo stato di CheckRequest su true per un tavolo specifico
     * @param tableID - ID del tavolo
     * @returns Booleano che indica il successo dell'operazione
     */
    async checkRequest(tableID: string): Promise<boolean> {
        try {
            // Aggiorna lo stato del tavolo
            const updatedTable = await strapi.documents('api::table.table').update({
                documentId: tableID,
                data: {
                    CheckRequest: true
                }
            });

            return !!updatedTable;
        } catch (error) {
            console.error("Errore durante l'aggiornamento della richiesta di check: ", error);
            return false;
        }
    }

})));