import Time "mo:core/Time";
import Array "mo:core/Array";

actor {

  type ShoppingItem = {
    id : Text;
    text : Text;
    purchased : Bool;
  };

  type MealEntry = {
    key : Text;
    value : Text;
  };

  var person1Name : Text = "Husband";
  var person2Name : Text = "Wife";
  var mealEntries : [MealEntry] = [];
  var shoppingItems : [ShoppingItem] = [];
  var houseItems : [ShoppingItem] = [];
  var lastModified : Int = 0;

  func touch() {
    lastModified := Time.now();
  };

  public query func getLastModified() : async Int {
    lastModified
  };

  public query func getMealPlan() : async {
    person1Name : Text;
    person2Name : Text;
    meals : [(Text, Text)];
  } {
    let pairs : [(Text, Text)] = mealEntries.map(func (e) : (Text, Text) { (e.key, e.value) });
    {
      person1Name = person1Name;
      person2Name = person2Name;
      meals = pairs;
    }
  };

  public func setNames(name1 : Text, name2 : Text) : async () {
    person1Name := name1;
    person2Name := name2;
    touch();
  };

  public func setMeal(key : Text, value : Text) : async () {
    let filtered : [MealEntry] = mealEntries.filter(func (e) : Bool { e.key != key });
    if (value == "") {
      mealEntries := filtered;
    } else {
      let singleton : [MealEntry] = [{ key = key; value = value }];
      mealEntries := filtered.concat(singleton);
    };
    touch();
  };

  public func clearMeals() : async () {
    mealEntries := [];
    touch();
  };

  public query func getShoppingList() : async [ShoppingItem] {
    shoppingItems
  };

  public func addShoppingItem(id : Text, text : Text) : async () {
    let singleton : [ShoppingItem] = [{ id = id; text = text; purchased = false }];
    shoppingItems := shoppingItems.concat(singleton);
    touch();
  };

  public func toggleShoppingItem(id : Text) : async () {
    shoppingItems := shoppingItems.map(func (item) : ShoppingItem {
      if (item.id == id) { { id = item.id; text = item.text; purchased = not item.purchased } }
      else { item }
    });
    touch();
  };

  public func clearShoppingList() : async () {
    shoppingItems := [];
    touch();
  };

  public func clearTickedShoppingItems() : async () {
    shoppingItems := shoppingItems.filter(func (item) : Bool { not item.purchased });
    touch();
  };

  public query func getHouseList() : async [ShoppingItem] {
    houseItems
  };

  public func addHouseItem(id : Text, text : Text) : async () {
    let singleton : [ShoppingItem] = [{ id = id; text = text; purchased = false }];
    houseItems := houseItems.concat(singleton);
    touch();
  };

  public func toggleHouseItem(id : Text) : async () {
    houseItems := houseItems.map(func (item) : ShoppingItem {
      if (item.id == id) { { id = item.id; text = item.text; purchased = not item.purchased } }
      else { item }
    });
    touch();
  };

  public func clearHouseList() : async () {
    houseItems := [];
    touch();
  };

  public func clearTickedHouseItems() : async () {
    houseItems := houseItems.filter(func (item) : Bool { not item.purchased });
    touch();
  };
}
