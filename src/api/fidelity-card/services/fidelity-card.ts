import { factories } from '@strapi/strapi';

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
     * Calcola lo sconto totale per un tavolo dato un array di utenti.
     * @param users - Array di ID degli utenti
     * @returns Oggetto contenente lo sconto totale e i dettagli per ogni utente
     */
    async calculateTableDiscount(users: string[]): Promise<object> {
        let totalDiscount = 0;
        const userDiscounts = [];

        for (const userId of users) {
            const fidelityCards = await strapi.documents('api::fidelity-card.fidelity-card').findMany({
                filters: { users_permissions_user: { documentId: userId } },
                limit: 1,
            });

            if (fidelityCards.length === 0) {
                userDiscounts.push({ userId, discount: 0, message: 'Fidelity card non trovata' });
                continue;
            }

            const fidelityCard = fidelityCards[0];

            // Calcola lo sconto basato sui punti
            const discount = fidelityCard.Points * 0.05; // 1 punto = 5 centesimi
            totalDiscount += discount;
            userDiscounts.push({ userId, discount });
        }

        return {
            success: true,
            message: 'Sconto totale calcolato',
            data: { totalDiscount: totalDiscount.toFixed(2), userDiscounts },
        };
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