/**
 * Controller per la gestione dei prodotti.
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { productPreprocessor } from './productPreprocessor';
import clientProductRule from './preprocessRules';

const { ApplicationError, UnauthorizedError } = errors;

// Crea un preprocessore per i prodotti del cliente utilizzando le regole definite
const clientPreprocessor = new productPreprocessor(clientProductRule);

// Definisce l'interfaccia per rappresentare i dettagli di un tavolo
interface Table {
    accessCode: string,    // Codice di accesso al tavolo
    sessionCode: string    // Codice di sessione del tavolo
}

export default factories.createCoreController('api::product.product', (({ strapi }) => ({

    /**
     * Crea un prodotto personalizzato per un cliente.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} ID del prodotto creato.
     * @throws {ApplicationError} Se mancano dati nella richiesta o il formato del prodotto è errato.
     * @throws {UnauthorizedError} Se le credenziali del tavolo non sono valide.
     */
    async createCustomProduct(ctx) {
        // Verifica che la richiesta contenga i campi necessari
        if (!ctx.request.body || !ctx.request.body.table || !ctx.request.body.product) {
            throw new ApplicationError("Missing field in request");
        }

        // Estrai i dettagli del tavolo e del prodotto dalla richiesta
        const { table, product } = ctx.request.body as { table: Table, product: any };

        // Verifica il codice di accesso al tavolo, solo gli utenti di un tavolo possono accedere a questa funzionalità
        const tableID = await strapi.service("api::table.table").verify(table.accessCode, table.sessionCode);
        if (!tableID) {
            throw new UnauthorizedError("Invalid table credential");
        }

        // Preprocessa il prodotto prima della creazione
        const processedProd = await clientPreprocessor.process(product);
        if (!processedProd) {
            throw new ApplicationError("Wrong Product Format");
        }

        // Crea un nuovo prodotto utilizzando il servizio dedicato
        const prodID = await strapi.service("api::product.product").createIgProduct(processedProd);
        if (!prodID) {
            throw new ApplicationError("Wrong Input Format");
        }

        // Restituisce l'ID del prodotto creato
        return { data: { id: prodID } };
    },

    /**
     * Recupera tutti gli ingredienti associati a un prodotto specifico.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Lista degli ingredienti associati al prodotto.
     * @throws {ApplicationError} Se l'ID del prodotto è mancante.
     */
    async ingredientOf(ctx) {
        const documentId = ctx.params.prodID;

        // Verifica che l'ID del prodotto sia specificato
        if (!documentId) {
            throw new ApplicationError("Missing ID");
        }

        // Recupera tutti gli ingredienti associati al prodotto specificato
        const ig = await strapi.documents("api::ingredient.ingredient").findMany({
            filters: {
                ingredient_wrappers: {
                    product: {
                        documentId: documentId
                    }
                }
            }
        });

        console.log(JSON.stringify(ig));

        // Restituisce i dati degli ingredienti
        return {
            data: ig
        };
    }

})));