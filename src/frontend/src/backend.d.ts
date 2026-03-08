import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export interface ShoppingItem {
    id: string;
    text: string;
    purchased: boolean;
}

export interface MealPlanResult {
    person1Name: string;
    person2Name: string;
    meals: Array<[string, string]>;
}

export interface backendInterface {
    getLastModified(): Promise<bigint>;
    getMealPlan(): Promise<MealPlanResult>;
    setNames(name1: string, name2: string): Promise<void>;
    setMeal(key: string, value: string): Promise<void>;
    clearMeals(): Promise<void>;
    getShoppingList(): Promise<ShoppingItem[]>;
    addShoppingItem(id: string, text: string): Promise<void>;
    toggleShoppingItem(id: string): Promise<void>;
    clearShoppingList(): Promise<void>;
    clearTickedShoppingItems(): Promise<void>;
    getHouseList(): Promise<ShoppingItem[]>;
    addHouseItem(id: string, text: string): Promise<void>;
    toggleHouseItem(id: string): Promise<void>;
    clearHouseList(): Promise<void>;
    clearTickedHouseItems(): Promise<void>;
}
