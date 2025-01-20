// Servizio per la gestione degli ordini totali
import { factories } from '@strapi/strapi';

// Enumerazione degli stati dell'ordine
export enum OrderState {
    New = 'New',                // Ordine appena creato
    Pending = 'Pending',        // Ordine in attesa
    InProgress = 'In Progress', // Ordine in preparazione
    Done = 'Done',              // Ordine completato
    Paid = 'Paid'               // Ordine pagato
}

export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    /**
     * Trova un ordine associato a un tavolo specifico.
     * 
     * @param {string} tableID - ID del tavolo.
     * @returns {Promise<string | false>} ID dell'ordine trovato o false se non esiste.
     */
    async findOrderByTableID(tableID: string): Promise<string | false> {
        const order = await strapi.documents('api::order.order').findMany({
            filters: {
                table: { documentId: tableID },
                State: OrderState.New
            },
            limit: 1
        });

        return order.length > 0 ? order[0].documentId : false;
    },

    /**
     * Recupera l'ordine associato a un tavolo.
     * 
     * @param {string} tableID - ID del tavolo.
     * @returns {Promise<object>} Dettagli dell'ordine trovato.
     */
    async getOrderByTable(tableID: string) {
        return strapi.documents('api::order.order').findFirst({
            filters: {
                table: { documentId: tableID },
                State: OrderState.New
            },
            populate: {
                partial_orders: {
                    populate: {
                        product: {
                            populate: ['category'],
                        },
                    },
                }
            }
        });
    },

    /**
     * Crea un nuovo ordine associato a un tavolo.
     * 
     * @param {string} tableID - ID del tavolo.
     * @param {OrderState} state - Stato iniziale dell'ordine.
     * @returns {Promise<string>} ID dell'ordine creato.
     */
    async createOrder(tableID: string, state: OrderState): Promise<string> {
        const order = await strapi.documents('api::order.order').create({
            data: {
                table: { documentId: tableID },
                State: state,
                AllCoursesTogether: false,
                Datetime: new Date().toISOString()
            }
        });

        console.log('Ordine totale creato:', order);
        return order.documentId;
    },

    /**
     * Conferma un ordine esistente cambiandone lo stato da "New" a "Pending".
     * 
     * @param {string} orderID - ID dell'ordine da confermare.
     * @param {boolean} allCoursesTogetherFlag - Flag per indicare se tutti i piatti devono essere serviti insieme.
     * @returns {Promise<boolean>} True se l'ordine è stato confermato con successo.
     * @throws {Error} Se l'ordine non è valido o già confermato.
     */
    async confirmOrder(orderID: string, allCoursesTogetherFlag: boolean): Promise<boolean> {
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID
        });

        if (!order || order.State !== OrderState.New) {
            throw new Error('Ordine non trovato o già confermato');
        }

        // Calcola i tempi di preparazione e di servizio
        const time = await this.calculatePrepTime(orderID);
        const previousOrder = await this.getOrderBefore(new Date().toISOString());
        const tts = time + (previousOrder ? previousOrder.TimeToService : 0);

        await strapi.documents('api::order.order').update({
            documentId: orderID,
            data: {
                Datetime: new Date().toISOString(),
                State: OrderState.Pending,
                AllCoursesTogether: allCoursesTogetherFlag,
                PreparationTime: time,
                TimeToService: tts,
            }
        });

        return true;
    },

    /**
     * Calcola il tempo di preparazione di un ordine.
     * 
     * @param {string} orderID - ID dell'ordine.
     * @returns {Promise<number>} Tempo totale di preparazione.
     */
    async calculatePrepTime(orderID: string): Promise<number> {
        const categoryMap: Map<string, number> = new Map<string, number>();

        // Recupera tutti i prodotti nell'ordine e le loro categorie
        const products = await strapi.documents("api::product.product").findMany({
            filters: {
                partial_orders: {
                    State: { $not: "Pending" },
                    order: { documentId: orderID },
                }
            },
            populate: ["category"]
        });

        // Determina il prodotto con il tempo di preparazione più lungo per ogni categoria
        products.forEach((product) => {
            const category = product.category.documentId;
            const time = product.TimeToPrepare;

            console.log("Product: ", product.Name, "Time: ", time);

            if (categoryMap.has(category)) {
                if (categoryMap.get(category) < time) {
                    categoryMap.set(category, time);
                }
            } else {
                categoryMap.set(category, time);
            }
        });

        // Somma i tempi di preparazione per tutte le categorie
        const prepTime: number = Array.from(categoryMap.values()).reduce((x, y) => x + y, 0);
        console.log("Preparation Time: ", prepTime);
        return prepTime;
    },

    /**
     * Recupera l'ordine immediatamente precedente a una certa data.
     * 
     * @param {string} isoDate - Data in formato ISO.
     * @returns {Promise<object | null>} Dettagli dell'ordine trovato o null.
     */
    async getOrderBefore(isoDate: string) {
        return strapi.documents("api::order.order").findFirst({
            filters: {
                Datetime: { $lt: isoDate },
                State: { $not: OrderState.New }
            },
            sort: [{ Datetime: "desc" }]
        });
    },

    /**
     * Modifica i tempi di servizio per tutti gli ordini successivi a una certa data.
     * 
     * @param {string} isoDate - Data di riferimento in formato ISO.
     * @param {number} timeChange - Variazione del tempo di servizio.
     */
    async editOrderAfter(isoDate: string, timeChange: number) {
        // Recupera tutti gli ordini successivi alla data specificata
        const orders = await strapi.documents("api::order.order").findMany({
            filters: {
                Datetime: { $gt: isoDate },
                State: { $in: [OrderState.Pending, OrderState.InProgress] }
            }
        });

        // Aggiorna i tempi di servizio di tutti gli ordini trovati
        Promise.all(
            orders.map((order) => (
                strapi.documents("api::order.order").update({
                    documentId: order.documentId,
                    data: { TimeToService: order.TimeToService + timeChange }
                })
            ))
        );
    },

    /**
     * Chiude tutti gli ordini parziali non completati associati a un ordine.
     * 
     * @param {string} orderID - ID dell'ordine.
     */
    async closeAllpartialOrder(orderID: string) {
        // Recupera tutti gli ordini parziali non completati
        const partial = await strapi.documents("api::partial-order.partial-order").findMany({
            filters: {
                State: { $not: "Done" },
                order: { documentId: orderID }
            }
        });

        // Aggiorna lo stato di tutti gli ordini parziali in parallelo
        Promise.all(
            partial.map((po) => (
                strapi.documents("api::partial-order.partial-order").update({
                    documentId: po.documentId,
                    data: { State: "Done" }
                })
            ))
        );
    },

    /**
     * Recupera tutti gli ordini associati a un tavolo.
     * 
     * @param {string} tableID - ID del tavolo.
     * @returns {Promise<object[]>} Lista degli ordini trovati.
     */
    async getAllOrderByTable(tableID: string) {
        return await strapi.documents("api::order.order").findMany({
            filters: {
                table: { documentId: tableID },
                State: { $in: [OrderState.Pending, OrderState.InProgress, OrderState.Done] }
            },
            populate: {
                partial_orders: {
                    populate: {
                        product: {
                            populate: ["category"]
                        }
                    }
                }
            }
        });
    }

}));