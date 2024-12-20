// Servizio per la gestione della Fidelity Card
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::fidelity-card.fidelity-card', ({ strapi }) => ({

    /**
     * Aggiorna i punti fedeltà dell'utente dopo un ordine parziale
     * @param users_permissions_user - ID dell'utente registrato
     * @param productID - ID del prodotto acquistato
     * @returns Messaggio con i punti aggiornati e lo sconto
     */
    async updateFidelityPoints(users_permissions_user: string, productID: string): Promise<string> {
        // Recupera il prodotto acquistato
        const product = await strapi.documents('api::product.product').findOne({
            documentId: productID
        });

        if (!product || !product.Price) {
            throw new Error('Prodotto non trovato o prezzo non valido');
        }

        // Calcola i punti fedeltà basati sul prezzo (1 euro = 1 punto)
        const pointsEarned = Math.ceil(product.Price);

        // Aggiorna la Fidelity Card dell'utente
        const fidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').findMany({
            filters: { users_permissions_user: { documentId: users_permissions_user } },
            limit: 1
        });

        let updatedPoints;
        if (fidelityCard.length === 0) {
            await strapi.documents('api::fidelity-card.fidelity-card').create({
                data: {
                    users_permissions_user: { documentId: users_permissions_user },
                    Points: pointsEarned
                }
            });
            updatedPoints = pointsEarned;
        } else {
            updatedPoints = fidelityCard[0].Points + pointsEarned;
            await strapi.documents('api::fidelity-card.fidelity-card').update({
                documentId: fidelityCard[0].documentId,
                data: {
                    Points: updatedPoints
                }
            });
        }

        const discount = this.calculateDiscount(updatedPoints);
        return `Punti guadagnati: ${pointsEarned}. Punti totali: ${updatedPoints}. Sconto disponibile: €${discount.toFixed(2)}.`;
    },

    /**
     * Calcola lo sconto disponibile in base ai punti
     * @param points - Punti disponibili
     * @returns Importo dello sconto
     */
    calculateDiscount(points: number): number {
        const discount = points * 0.10; // 1 punto = 10 centesimi di sconto
        return discount;
    }

}));
