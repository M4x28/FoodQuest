// Servizio per la gestione degli ordini totali
import { factories } from '@strapi/strapi';
import product from '../../product/services/product';

// Enumerazione degli stati dell'ordine
export enum OrderState {
    New = 'New',
    Pending = 'Pending',
    InProgress = 'In Progress',
    Done = 'Done',
    Paid = 'Paid'
}

export default factories.createCoreService('api::order.order', ({ strapi }) => ({

    /**
     * Trova un ordine associato al tavolo
     * @param tableID - ID del tavolo
     * @returns ID dell'ordine o false se non esiste
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
     * Crea un nuovo ordine associato a un tavolo
     * @param tableID - documentId del tavolo
     * @param state - Stato iniziale dell'ordine
     * @returns ID dell'ordine creato
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
    * Conferma un ordine esistente cambiando lo stato da "New" a "Pending"
    * @param orderID - documentId dell'ordine totale da confermare
    */
    async confirmOrder(orderID: string, allCoursesTogetherFlag: boolean): Promise<boolean> {
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderID
        });

        if (!order || order.State !== OrderState.New) {
            throw new Error('Ordine non trovato o già confermato');
        }

        //Calculating Time and time to service
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

    //Calculate Preparation Time of new order
    async calculatePrepTime(orderID: string): Promise<number> {

        const categoryMap: Map<string, number> = new Map<string, number>();

        //Get all products in the order and their category
        const products = await strapi.documents("api::product.product").findMany({
            filters: {
                partial_orders: {
                    State: {
                        $not: "Pending"
                    },
                    order: {
                        documentId: orderID
                    },
                }
            },
            populate: ["category"]
        });

        //Getting the product with the longest time to prepare for each category
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

        //Sum times
        const prepTime: number = Array.from(categoryMap.values()).reduce((x, y) => x + y, 0);
        console.log("Preparation Time: ", prepTime);
        return prepTime;
    },

    //Get the order right before order made in time: isoDate
    async getOrderBefore(isoDate: string) {

        return strapi.documents("api::order.order").findFirst({
            filters: {
                Datetime: {
                    $lt: isoDate
                },
                State: {
                    $not: OrderState.New,
                }
            },
            sort: [
                {
                    Datetime: "desc"
                }
            ]
        })
    },

    //Change the time of all order after isoDate
    async editOrderAfter(isoDate: string, timeChange: number) {

        //Find all orders made after isoDate
        const orders = await strapi.documents("api::order.order").findMany(
            {
                filters: {
                    Datetime: {
                        $gt: isoDate,
                    },
                    State: {
                        $in: [OrderState.Pending, OrderState.InProgress],
                    }
                }
            }
        )

        //Updating time of all found order by timeChange
        Promise.all(
            orders.map((order) => (
                strapi.documents("api::order.order").update(
                    {
                        documentId: order.documentId,
                        data: {
                            TimeToService: order.TimeToService + timeChange,
                        }
                    })
            ))
        )
    },

    async closeAllpartialOrder(orderID: string) {
        //Fetch all non done partial in order
        const partial = await strapi.documents("api::partial-order.partial-order").findMany({
            filters: {
                State: {
                    $not: "Done"
                },
                order: {
                    documentId: orderID
                }
            }
        });

        //Update all in parallel
        Promise.all(
            partial.map(po => (
                strapi.documents("api::partial-order.partial-order").update({
                    documentId: po.documentId,
                    data: {
                        State: "Done"
                    }
                })
            ))
        )

    },

    async getAllOrderByTable(tableID: string) {
        return await strapi.documents("api::order.order").findMany({
            filters: {
                table: {
                    documentId: tableID,
                },
                State: {
                    $in: [OrderState.Pending, OrderState.InProgress, OrderState.Done],
                }
            },
            populate: {
                partial_orders: {
                    populate: ["product"],
                }
            }
        })
    }

}));
