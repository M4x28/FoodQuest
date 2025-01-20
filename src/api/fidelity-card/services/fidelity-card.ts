import { factories } from '@strapi/strapi';
const POINT_VALUE = 0.05; // Valore di ogni punto fedeltà

export default factories.createCoreService('api::fidelity-card.fidelity-card', ({ strapi }) => ({

    /**
     * Aggiorna i punti fedeltà di un utente in base a una lista di prodotti acquistati.
     * @param users_permissions_user - ID dell'utente che possiede la fidelity card
     * @param productIDs - Array di ID dei prodotti acquistati
     * @returns Oggetto contenente i punti aggiornati e i punti guadagnati
     */
    async addFidelityPoints(users_permissions_user: string, productIDs: string[]): Promise<object> {
        if (!Array.isArray(productIDs) || productIDs.length === 0) {
            throw new Error('Nessun prodotto fornito');
        }

        let totalPointsEarned = 0;

        // Itera sui prodotti e calcola i punti guadagnati
        for (const productID of productIDs) {
            const product = await strapi.documents('api::product.product').findOne({
                documentId: productID,
            });

            if (!product || !product.Price) {
                throw new Error(`Prodotto non trovato o prezzo non valido per ID: ${productID}`);
            }

            // 1 punto per ogni euro speso
            const pointsEarned = Math.ceil(product.Price); // arrotonda all'intero più vicino
            totalPointsEarned += pointsEarned;
        }

        // Recupera la fidelity card dell'utente tramite findMany con filtro
        const fidelityCards = await strapi.documents('api::fidelity-card.fidelity-card').findMany({
            filters: { users_permissions_user: { documentId: users_permissions_user } },
            limit: 1,
        });

        if (fidelityCards.length === 0) {
            throw new Error('Fidelity card non trovata');
        }

        const fidelityCard = fidelityCards[0];

        // Aggiorna i punti totali
        const updatedPoints = fidelityCard.Points + totalPointsEarned;
        await strapi.documents('api::fidelity-card.fidelity-card').update({
            documentId: fidelityCard.documentId,
            data: { Points: updatedPoints },
        });

        return {
            success: true,
            message: 'Punti aggiornati',
            data: { totalPoints: updatedPoints, pointsEarned: totalPointsEarned },
        };
    },

    /**
     * Calcola lo sconto totale per un tavolo dato il numero del tavolo
     * @param {number} tableNumber - Il numero del tavolo
     * @returns {number} - Lo sconto totale calcolato
     */
    async calculateTableDiscount(tableNumber) {
        try {
            // Trova il tavolo corrispondente al numero e popola gli ordini associati
            const tables = await strapi.documents('api::table.table').findMany({
                filters: { Number: tableNumber },
                populate: {
                    orders: { // Popola gli ordini associati al tavolo
                        populate: { // Popola i partial-orders e gli utenti associati
                            partial_orders: {
                                populate: {
                                    users_permissions_user: { populate: { fidelity_card: true } }, // Popola la fidelity card
                                },
                            },
                        },
                    },
                },
            });

            if (!tables || tables.length === 0) {
                throw new Error(`Nessun tavolo trovato con il numero ${tableNumber}`);
            }

            const table = tables[0]; // Recupera il primo tavolo trovato

            // Verifica se ci sono ordini associati al tavolo
            if (!table.orders || table.orders.length === 0) {
                return 0; // Nessun ordine associato, sconto totale = 0
            }

            // Calcola lo sconto totale basandosi sui punti delle fidelity cards
            let totalDiscount = 0;

            for (const order of table.orders) {
                for (const partialOrder of order.partial_orders) {
                    const fidelityCard = partialOrder.users_permissions_user?.fidelity_card;
                    if (fidelityCard && fidelityCard.Points) {
                        totalDiscount += fidelityCard.Points; // Somma i punti della fidelity card
                    }
                }
            }

            // Restituisci lo sconto totale calcolato
            return totalDiscount * POINT_VALUE;
        } catch (error) {
            strapi.log.error('Errore durante il calcolo dello sconto totale per il tavolo:', error);
            throw new Error('Errore durante il calcolo dello sconto totale per il tavolo');
        }
    },

    /**
     * Crea una nuova fidelity card per un utente.
     * @param users_permissions_user - ID dell'utente
     * @returns Fidelity card creata
     */
    async createFidelityCard(users_permissions_user: string): Promise<object> {
        const existingCards = await strapi.documents('api::fidelity-card.fidelity-card').findMany({
            filters: { users_permissions_user: { documentId: users_permissions_user } },
            limit: 1,
        });

        if (existingCards.length > 0) {
            throw new Error('Fidelity card già esistente per questo utente');
        }

        const fidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').create({
            data: {
                users_permissions_user: { documentId: users_permissions_user },
                Points: 0,
                UsePoints: null,
            },
        });

        return {
            success: true,
            message: 'Fidelity card creata con successo',
            data: fidelityCard,
        };
    },

    /**
     * Aggiorna lo stato del campo UsePoints per un utente
     * @param users_permissions_user - ID dell'utente
     * @param usePoints - Nuovo stato (0, 1, null)
     * @returns Messaggio di successo o errore
     */
    async updateUsePoints(users_permissions_user: string, usePoints: 0 | 1 | null): Promise<object> {
        // Trova la fidelity card dell'utente
        const fidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').findFirst({
            filters: { users_permissions_user: { documentId: users_permissions_user } },
        });

        if (!fidelityCard) {
            throw new Error('Fidelity card non trovata');
        }

        // Aggiorna il campo UsePoints
        const updatedFidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').update({
            documentId: fidelityCard.documentId,
            data: { UsePoints: usePoints },
        });

        return {
            success: true,
            message: 'Stato di UsePoints aggiornato con successo',
            data: updatedFidelityCard,
        };
    },

    /**
     * Recupera una fidelity card basata sull'ID dell'utente
     * @param users_permissions_user - ID dell'utente
     * @returns Fidelity card o null se non trovata
     */
    async getFidelityCard(users_permissions_user: string): Promise<object | null> {
        const fidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').findFirst({
            filters: { users_permissions_user: { documentId: users_permissions_user } },
        });

        return fidelityCard || null;
    },

    /**
     * Resetta i punti di una fidelity card se UsePoints è settato a 1
     * @param users_permissions_user - Array di ID degli utenti
     * @returns Oggetto con liste di successi e fallimenti
     */
    async resetPoints(users_permissions_user: string[]): Promise<object> {
        const success = [];
        const failed = [];

        for (const userId of users_permissions_user) {
            try {
                const fidelityCard = await strapi.documents('api::fidelity-card.fidelity-card').findFirst({
                    filters: {
                        users_permissions_user: {
                            id: { $in: users_permissions_user },
                        },
                    },
                });

                if (!fidelityCard) {
                    failed.push({ userId, reason: 'Fidelity card non trovata' });
                    continue;
                }

                if (!fidelityCard.UsePoints) {
                    failed.push({ userId, reason: 'UsePoints non settato a 1' });
                    continue;
                }

                await strapi.documents('api::fidelity-card.fidelity-card').update({
                    documentId: fidelityCard.documentId,
                    data: { Points: 0 },
                });

                success.push(userId);
            } catch (error) {
                failed.push({ userId, reason: error.message });
            }
        }

        return { success, failed };
    },
}));