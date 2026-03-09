import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DinnerIdea {
    id: string;
    placeSeen: string;
    thisWeek: boolean;
    link: string;
    name: string;
}
export interface ShoppingItem {
    id: string;
    text: string;
    purchased: boolean;
}
export interface LunchIdea {
    id: string;
    placeSeen: string;
    thisWeek: boolean;
    link: string;
    name: string;
}
export interface backendInterface {
    addDinnerIdea(id: string, name: string, placeSeen: string, link: string): Promise<void>;
    addHouseItem(id: string, text: string): Promise<void>;
    addLunchIdea(id: string, name: string, placeSeen: string, link: string): Promise<void>;
    addShoppingItem(id: string, text: string): Promise<void>;
    clearDinnerIdeas(): Promise<void>;
    clearHouseList(): Promise<void>;
    clearLunchIdeas(): Promise<void>;
    clearMeals(): Promise<void>;
    clearShoppingList(): Promise<void>;
    clearTickedHouseItems(): Promise<void>;
    clearTickedShoppingItems(): Promise<void>;
    getDinnerIdeas(): Promise<Array<DinnerIdea>>;
    getHouseList(): Promise<Array<ShoppingItem>>;
    getLastModified(): Promise<bigint>;
    getLunchIdeas(): Promise<Array<LunchIdea>>;
    getMealPlan(): Promise<{
        meals: Array<[string, string]>;
        person1Name: string;
        person2Name: string;
    }>;
    getShoppingList(): Promise<Array<ShoppingItem>>;
    removeDinnerIdea(id: string): Promise<void>;
    removeLunchIdea(id: string): Promise<void>;
    setMeal(key: string, value: string): Promise<void>;
    setNames(name1: string, name2: string): Promise<void>;
    toggleDinnerIdeaThisWeek(id: string): Promise<void>;
    toggleHouseItem(id: string): Promise<void>;
    toggleLunchIdeaThisWeek(id: string): Promise<void>;
    toggleShoppingItem(id: string): Promise<void>;
}
