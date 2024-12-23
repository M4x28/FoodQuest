/**
 * product service
 */

import { factories } from '@strapi/strapi';

export interface ProductIngredientDetail{
    categoryID:string,
    price:number
    name:string
    ingredientsID:string[];
}

export default factories.createCoreService('api::product.product',(({strapi}) => ({

    async createIgProduct(product:ProductIngredientDetail):Promise<string> {

        console.log("Creating Product",product);

        const targetProduct:string|null = await this.findProductFromIngredient(product);

        if(targetProduct){
            return targetProduct;
        } else { 
            return await productFactory(product);
        }
    },

    findProductFromIngredient(product:ProductIngredientDetail ):Promise<string|null>{
        return strapi.documents("api::ingredient-wrapper.ingredient-wrapper")
        .findMany({
            populate:{
                ingredients:{
                    fields:["id"],
                },
                product:{
                    fields:["id"]
                }
            },
            filters:{
                category: {
                    documentId:product.categoryID,
                },
                //Check if wrapper contains every ingredients requesed
                $and: product.ingredientsID.map((ig) => ({ingredients:{
                    documentId:ig,
                }}))
            },
        }).then((result) => {
            //Right wrapper must have exactly ingredientsID.lenght ingredients, filtering out the one with extra
            const targetWrapper = result
                .filter((value) => value.ingredients.length == product.ingredientsID.length);
            if(targetWrapper.length == 1){
                return targetWrapper[0].product.documentId;
            }
            else return null;
        });
    }

})));


//UTILIY METHODS
export async function ingredientsPrice(ingredientsID:string[]):Promise<number> {
    
    //Feching price of every ingredient
    const ig = await strapi.documents("api::ingredient.ingredient").findMany(
        {
            fields:["Price"],
            filters:{
                documentId:{
                    $in:ingredientsID,
                }
            }
        }
    );

    return ig.map((ig) => (ig.Price))
        .reduce((total,price) => (total + price), 0);
}

export async function ingredientsAllergen(ingredientsID:string[]):Promise<string[]>{
    const result = await strapi.documents("api::allergen.allergen").findMany({
        filters:{
            ingredients:{
                documentId:{
                    $in: ingredientsID,
                }
            }
        }
    });

    return result.map(allergen => allergen.documentId);
}

//Create the product
export async function productFactory(product:ProductIngredientDetail):Promise<string>{

    //Create both new Wrapper and new Product in parallel
    const [newWrapper,newProduct] = await Promise.all([
        //Create Wrapper
        strapi.documents("api::ingredient-wrapper.ingredient-wrapper")
            .create({
                data:{
                    category: product.categoryID,
                    ingredients: product.ingredientsID
                },
            status: "published",  
        }),
        
        //Create Product
        //Before creatign must fetch the allergen
        ingredientsAllergen(product.ingredientsID).then(async (allergens) => {
            return await strapi.documents("api::product.product")
            .create({
                data:{
                    Name:product.name,
                    category: product.categoryID,
                    Available: false,
                    allergens:allergens,
                    TimeToPrepare: product.ingredientsID.length + 2,
                    Price:product.price
                },
                status: "published",
            });
        })
    ])

    //Linking toghether product and wrapper
    await strapi.documents("api::ingredient-wrapper.ingredient-wrapper")
    .update({
        documentId: newWrapper.documentId,
        data:{
            product: newProduct.documentId,
        },
        status: "published",
    })

    return newProduct.documentId;
}
