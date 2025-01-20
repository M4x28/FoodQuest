/**
 * Servizio per la gestione dei tavoli.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::table.table', (({ strapi }) => ({

    /**
     * Verifica l'accesso a un tavolo utilizzando il codice di accesso e il codice di sessione.
     * 
     * @param {string} accessCode - Codice di accesso al tavolo.
     * @param {string} sessionCode - Codice di sessione del tavolo.
     * @returns {Promise<string | null>} L'ID del tavolo se trovato, altrimenti null.
     */
    async verify(accessCode: string, sessionCode: string): Promise<string | null> {
        // Cerca un tavolo che corrisponda ai criteri specificati
        const table = await strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode,  // Filtra per codice di accesso
                SessionCode: sessionCode, // Filtra per codice di sessione
                CheckRequest: false      // Esclude i tavoli con richiesta di check
            }
        });

        // Restituisce l'ID del tavolo se trovato, altrimenti null
        return table ? table.documentId : null;
    },

    /**
     * Recupera le informazioni di un tavolo utilizzando il codice di accesso.
     * 
     * @param {string} accessCode - Codice di accesso al tavolo.
     * @returns {Promise<object | null>} Informazioni del tavolo trovato o null se non esiste.
     */
    async getTable(accessCode: string) {
        return strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode, // Filtra per codice di accesso
            }
        });
    },

    /**
     * Imposta lo stato `CheckRequest` su `true` per un tavolo specifico.
     * 
     * @param {string} tableID - ID del tavolo.
     * @returns {Promise<boolean>} True se l'operazione è riuscita, altrimenti false.
     */
    async checkRequest(tableID: string): Promise<boolean> {
        try {
            // Aggiorna il campo `CheckRequest` per il tavolo specificato
            const updatedTable = await strapi.documents('api::table.table').update({
                documentId: tableID,
                data: {
                    CheckRequest: true // Imposta lo stato della richiesta di check su `true`
                }
            });

            // Restituisce true se l'aggiornamento è riuscito
            return !!updatedTable;
        } catch (error) {
            console.error("Errore durante l'aggiornamento della richiesta di check: ", error);
            // Restituisce false in caso di errore
            return false;
        }
    }

})));