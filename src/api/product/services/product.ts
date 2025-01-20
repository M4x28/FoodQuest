/**
 * Servizio per la gestione dei prodotti.
 */

import { factories } from '@strapi/strapi';

// Interfaccia per definire i dettagli degli ingredienti di un prodotto
export interface ProductIngredientDetail {
    categoryID: string,     // ID della categoria del prodotto
    price: number,          // Prezzo del prodotto
    name: string,           // Nome del prodotto
    ingredientsID: string[] // Array di ID degli ingredienti del prodotto
}

export default factories.createCoreService('api::product.product', (({ strapi }) => ({

    /**
     * Crea un prodotto utilizzando i dettagli forniti o recupera un prodotto esistente con gli stessi ingredienti.
     * 
     * @param {ProductIngredientDetail} product - Dettagli del prodotto da creare.
     * @returns {Promise<string>} ID del prodotto creato o recuperato.
     */
    async createIgProduct(product: ProductIngredientDetail): Promise<string> {
        console.log("Creating Product", product);

        // Verifica se esiste già un prodotto con gli stessi ingredienti
        const targetProduct: string | null = await this.findProductFromIngredient(product);

        if (targetProduct) {
            // Restituisce l'ID del prodotto esistente
            return targetProduct;
        } else {
            // Crea un nuovo prodotto
            return await productFactory(product);
        }
    },

    /**
     * Trova un prodotto esistente con gli stessi ingredienti specificati.
     * 
     * @param {ProductIngredientDetail} product - Dettagli del prodotto da cercare.
     * @returns {Promise<string | null>} ID del prodotto trovato o null se non esiste.
     */
    findProductFromIngredient(product: ProductIngredientDetail): Promise<string | null> {
        return strapi.documents("api::ingredient-wrapper.ingredient-wrapper")
            .findMany({
                populate: {
                    ingredients: {
                        fields: ["id"], // Recupera solo gli ID degli ingredienti
                    },
                    product: {
                        fields: ["id"], // Recupera solo gli ID dei prodotti
                    }
                },
                filters: {
                    category: {
                        documentId: product.categoryID, // Filtra per categoria
                    },
                    // Controlla che il wrapper contenga esattamente gli ingredienti richiesti
                    $and: product.ingredientsID.map((ig) => ({
                        ingredients: {
                            documentId: ig,
                        }
                    }))
                },
            }).then((result) => {
                // Filtra per trovare il wrapper con esattamente il numero di ingredienti richiesti
                const targetWrapper = result.filter((value) => value.ingredients.length == product.ingredientsID.length);

                if (targetWrapper.length == 1) {
                    // Restituisce l'ID del prodotto associato
                    return targetWrapper[0].product.documentId;
                } else {
                    // Nessun prodotto corrispondente trovato
                    return null;
                }
            });
    }

})));


// METODI UTILI

/**
 * Calcola il prezzo totale degli ingredienti specificati.
 * 
 * @param {string[]} ingredientsID - Array di ID degli ingredienti.
 * @returns {Promise<number>} Prezzo totale degli ingredienti.
 */
export async function ingredientsPrice(ingredientsID: string[]): Promise<number> {
    // Recupera i prezzi di ogni ingrediente
    const ig = await strapi.documents("api::ingredient.ingredient").findMany({
        fields: ["Price"], // Recupera solo il campo "Price"
        filters: {
            documentId: {
                $in: ingredientsID, // Filtra per gli ID specificati
            }
        }
    });

    // Somma i prezzi di tutti gli ingredienti
    return ig.map((ig) => (ig.Price))
        .reduce((total, price) => (total + price), 0);
}

/**
 * Recupera tutti gli allergeni associati agli ingredienti specificati.
 * 
 * @param {string[]} ingredientsID - Array di ID degli ingredienti.
 * @returns {Promise<string[]>} Array di ID degli allergeni trovati.
 */
export async function ingredientsAllergen(ingredientsID: string[]): Promise<string[]> {
    const result = await strapi.documents("api::allergen.allergen").findMany({
        filters: {
            ingredients: {
                documentId: {
                    $in: ingredientsID, // Filtra per gli ID specificati
                }
            }
        }
    });

    // Restituisce l'elenco degli ID degli allergeni
    return result.map(allergen => allergen.documentId);
}

/**
 * Crea un nuovo prodotto e il relativo wrapper per gli ingredienti.
 * 
 * @param {ProductIngredientDetail} product - Dettagli del prodotto da creare.
 * @returns {Promise<string>} ID del prodotto creato.
 */
export async function productFactory(product: ProductIngredientDetail): Promise<string> {
    // Crea contemporaneamente un nuovo wrapper e un nuovo prodotto
    const [newWrapper, newProduct] = await Promise.all([
        // Crea il wrapper degli ingredienti
        strapi.documents("api::ingredient-wrapper.ingredient-wrapper").create({
            data: {
                category: product.categoryID,
                ingredients: product.ingredientsID
            },
            status: "published", // Imposta lo stato come pubblicato
        }),

        // Crea il prodotto
        // Prima di creare il prodotto, recupera gli allergeni associati
        ingredientsAllergen(product.ingredientsID).then(async (allergens) => {
            return await strapi.documents("api::product.product").create({
                data: {
                    Name: product.name,
                    category: product.categoryID,
                    Available: false,
                    allergens: allergens, // Associa gli allergeni trovati
                    TimeToPrepare: product.ingredientsID.length + 2, // Tempo di preparazione basato sul numero di ingredienti
                    Price: product.price // Prezzo del prodotto
                },
                status: "published", // Imposta lo stato come pubblicato
            });
        })
    ]);

    // Collega il prodotto creato al wrapper degli ingredienti
    await strapi.documents("api::ingredient-wrapper.ingredient-wrapper").update({
        documentId: newWrapper.documentId,
        data: {
            product: newProduct.documentId,
        },
        status: "published",
    });

    // Restituisce l'ID del prodotto creato
    return newProduct.documentId;
}