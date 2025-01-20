import { ProductIngredientDetail } from "../services/product";
import { preprocessRules } from "./productPreprocessor";

// Regole di preprocessamento dei prodotti per i clienti
const clientProductRule: preprocessRules = {
    Pizza: processPizza, // Regola per gestire il prodotto "Pizza"
    Antipasto: deny,     // Regola che nega i prodotti "Antipasto"
    Bevanda: deny,       // Regola che nega i prodotti "Bevanda"
};

// Esporta le regole per l'utilizzo in altre parti del progetto
export default clientProductRule;

/**
 * Funzione base per negare l'elaborazione di un prodotto.
 * 
 * @param {any} product - Dati del prodotto.
 * @returns {Promise<null>} Sempre null per indicare che il prodotto è negato.
 */
async function deny(product: any): Promise<null> {
    return null;
}

/**
 * Elabora un prodotto del tipo "Pizza", assicurandosi che abbia solo una base e ingredienti validi.
 * 
 * @param {any} product - Dati del prodotto.
 * @returns {Promise<ProductIngredientDetail | null>} Dettagli degli ingredienti del prodotto o null se non valido.
 */
async function processPizza(product: any): Promise<ProductIngredientDetail | null> {
    // Verifica che i dati del prodotto siano validi
    if (!product.baseID || !product.ingredientsID || product.ingredientsID.length == 0) {
        return null; // Rifiuta input non valido
    }

    // Controlla i dettagli degli ingredienti in parallelo
    let [base, ingredients] = await Promise.all([
        // Recupera i dettagli della base
        strapi.documents("api::ingredient.ingredient").findOne({
            documentId: product.baseID,
            fields: ["Type", "Price"], // Recupera solo i campi rilevanti
        }),
        // Recupera i dettagli degli ingredienti
        strapi.documents("api::ingredient.ingredient").findMany({
            fields: ["Type", "Price"], // Recupera solo i campi rilevanti
            filters: {
                documentId: product.ingredientsID, // Filtra per gli ID degli ingredienti forniti
            },
        }),
    ]);

    // Valida la base e gli ingredienti
    const validBase = base ? base.Type === "pizza-base" : false; // La base deve essere di tipo "pizza-base"
    const validIg =
        ingredients.length > 0 &&
        ingredients.filter((i) => i.Type === "pizza-base").length === 0; // Nessun ingrediente può essere di tipo "pizza-base"

    if (validBase && validIg) {
        // Calcola il prezzo totale
        let price: number = base.Price;
        price += ingredients.reduce((tot, prod) => tot + prod.Price, 0);

        // Unisce la base e gli ingredienti in un unico elenco
        return {
            name: "Custom", // Nome del prodotto personalizzato
            price: price, // Prezzo totale calcolato
            categoryID: product.categoryID, // ID della categoria del prodotto
            ingredientsID: [product.baseID, ...product.ingredientsID], // ID della base e degli ingredienti
        };
    } else {
        return null; // Ritorna null se la validazione fallisce
    }
}