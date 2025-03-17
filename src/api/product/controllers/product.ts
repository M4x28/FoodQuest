/**
 * Controller per la gestione dei prodotti.
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import clientProductRule from './preprocessRules';
import { productPreprocessor } from './productPreprocessor';

const { ApplicationError, UnauthorizedError } = errors;

// Prepoceesor to apply rules on created product (for client)
const clientPreprocessor = new productPreprocessor(clientProductRule);

interface Table {
    accessCode: string,
    sessionCode: string
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

        //Verify requested are in body
        if (!ctx.request.body || !ctx.request.body.table || !ctx.request.body.product) {
            throw new ApplicationError("Missing field in request");
        }

        //Unpack body
        const { table, product } = ctx.request.body as { table: Table, product: any };

        //Verify table info, only user at a table can use this funtionality
        const tableID = await strapi.service("api::table.table").verify(table.accessCode, table.sessionCode);
        if (!tableID) {
            throw new UnauthorizedError("Invalid table credential");
        }

        //Preprosser product before creating
        const processedProd = await clientPreprocessor.process(product);
        console.log(ctx.request.body.product);
        console.log(product);

        //Check for rejection
        if (!processedProd) {
            throw new ApplicationError("Wrong Product Format");
        }

        //Create the new product
        const prodID = await strapi.service("api::product.product").createIgProduct(processedProd);

        if (!prodID) {
            throw new ApplicationError("Wrong Input Format");
        }

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