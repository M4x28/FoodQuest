/**
 * Controller per la gestione delle categorie
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

export default factories.createCoreController('api::category.category', (({ strapi }) => ({

    /**
     * Metodo per ottenere tutti i prodotti disponibili di una determinata categoria.
     * 
     * @param {object} ctx - Il contesto della richiesta, contenente i parametri e altre informazioni.
     * @throws {ApplicationError} Se l'ID della categoria non è fornito o se la categoria non esiste.
     * @returns {object} Un oggetto contenente i dati dei prodotti disponibili nella categoria selezionata.
     */
    async allProd(ctx) {

        // Verifica che l'ID della categoria sia presente nella richiesta
        if (!ctx.params.id) {
            throw new ApplicationError("Missing ID in request");
        }

        // Trova tutti i prodotti disponibili associati alla categoria specificata
        const result = await strapi.documents("api::product.product").findMany({
            filters: {
                category: {
                    documentId: ctx.params.id
                },
                Available: true, // Filtra solo i prodotti disponibili
            },
            populate: {
                ingredient_wrapper: { // Popola i dettagli degli ingredienti
                    populate: {
                        ingredients: {
                            fields: [] // Specifica i campi da includere
                        }
                    }
                },
                allergens: { // Popola i dettagli degli allergeni
                    fields: []
                },
                Image: true // Include i dettagli delle immagini
            }
        });

        // Se la categoria non esiste o non contiene prodotti, solleva un'eccezione
        if (!result) {
            throw new ApplicationError("Category not found");
        }

        // Trasforma i dati dei prodotti nel formato desiderato
        const prod = result.map(p => {
            let ingredientsID = undefined;
            if (p.ingredient_wrapper) {
                // Estrai gli ID degli ingredienti
                ingredientsID = p.ingredient_wrapper.ingredients.map((i) => i.documentId);
            }

            let allergensID = undefined;
            if (p.allergens.length > 0) {
                // Estrai gli ID degli allergeni
                allergensID = p.allergens.map((a) => a.documentId);
            }

            // Ritorna un oggetto contenente i dettagli del prodotto
            return {
                documentId: p.documentId,
                Name: p.Name,
                Price: p.Price,
                ingredients: ingredientsID,
                allergens: allergensID,
                image: p.Image ? (p.Image.hash + p.Image.ext) : null,
            };
        });

        // Ritorna i dati dei prodotti trasformati
        return { data: prod };
    }

})));