/*
    Contiene la logica per applicare regole personalizzate a qualsiasi prodotto 
    prima della sua creazione, in base alla categoria.
*/

import { ProductIngredientDetail } from "../services/product";

// Interfaccia per definire le regole di preprocessamento per ciascuna categoria
export interface preprocessRules {
    [key: string]: (product: any) => Promise<ProductIngredientDetail | null>;
}

// Classe per preprocessare i prodotti prima della loro creazione
export class productPreprocessor {

    // Set di regole specifiche per ciascuna categoria
    private ruleset: preprocessRules;

    /**
     * Costruttore per inizializzare il preprocessore con un set di regole.
     * 
     * @param {preprocessRules} ruleset - Regole di preprocessamento per categoria.
     */
    constructor(ruleset: preprocessRules) {
        this.ruleset = ruleset;
    }

    /**
     * Processa un prodotto in base alla sua categoria, applicando le regole definite.
     * 
     * @param {any} product - Il prodotto da preprocessare.
     * @returns {Promise<ProductIngredientDetail | null>} Il prodotto preprocessato o null se non valido.
     */
    async process(product: any): Promise<ProductIngredientDetail | null> {
        // Rifiuta prodotti senza categoria, ogni prodotto deve averne una
        if (!product.categoryID) {
            return null;
        }

        // Recupera il nome della categoria dal database
        const category = await strapi.documents("api::category.category").findOne({
            documentId: product.categoryID, // Filtra per ID della categoria
            fields: ["Name"], // Recupera solo il campo "Name"
        });

        // Se la categoria esiste ed è presente una regola associata, applica la funzione di preprocessamento
        if (category && this.ruleset[category.Name]) {
            console.log("Creating: ", category.Name);
            return await this.ruleset[category.Name](product);
        } else {
            // Log per prodotti senza una regola associata alla categoria
            console.log("No category found");
            return null;
        }
    }
}