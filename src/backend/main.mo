import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";



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

  type DinnerIdea = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    thisWeek : Bool;
  };

  type LunchIdea = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    thisWeek : Bool;
  };

  var person1Name : Text = "Husband";
  var person2Name : Text = "Wife";
  var mealEntries : [MealEntry] = [];
  var shoppingItems : [ShoppingItem] = [];
  var houseItems : [ShoppingItem] = [];
  var dinnerIdeas : [DinnerIdea] = [];
  var lunchIdeas : [LunchIdea] = [];
  var lastModified : Int = 0;

  func touch() {
    lastModified := Time.now();
  };

  public query func getLastModified() : async Int {
    lastModified;
  };

  public query func getMealPlan() : async {
    person1Name : Text;
    person2Name : Text;
    meals : [(Text, Text)];
  } {
    let pairs : [(Text, Text)] = mealEntries.map(func(e) { (e.key, e.value) });
    {
      person1Name;
      person2Name;
      meals = pairs;
    };
  };

  public func setNames(name1 : Text, name2 : Text) : async () {
    person1Name := name1;
    person2Name := name2;
    touch();
  };

  public func setMeal(key : Text, value : Text) : async () {
    let filtered = mealEntries.filter(func(e) { e.key != key });
    if (value == "") {
      mealEntries := filtered;
    } else {
      let singleton = [{ key; value }];
      mealEntries := filtered.concat(singleton);
    };
    touch();
  };

  public func clearMeals() : async () {
    mealEntries := [];
    touch();
  };

  public query func getShoppingList() : async [ShoppingItem] {
    shoppingItems;
  };

  public func addShoppingItem(id : Text, text : Text) : async () {
    let singleton = [{ id; text; purchased = false }];
    shoppingItems := shoppingItems.concat(singleton);
    touch();
  };

  public func toggleShoppingItem(id : Text) : async () {
    shoppingItems := shoppingItems.map(func(item) { if (item.id == id) { { id = item.id; text = item.text; purchased = not item.purchased } } else { item } });
    touch();
  };

  public func clearShoppingList() : async () {
    shoppingItems := [];
    touch();
  };

  public func clearTickedShoppingItems() : async () {
    shoppingItems := shoppingItems.filter(func(item) { not item.purchased });
    touch();
  };

  public query func getHouseList() : async [ShoppingItem] {
    houseItems;
  };

  public func addHouseItem(id : Text, text : Text) : async () {
    let singleton = [{ id; text; purchased = false }];
    houseItems := houseItems.concat(singleton);
    touch();
  };

  public func toggleHouseItem(id : Text) : async () {
    houseItems := houseItems.map(func(item) { if (item.id == id) { { id = item.id; text = item.text; purchased = not item.purchased } } else { item } });
    touch();
  };

  public func clearHouseList() : async () {
    houseItems := [];
    touch();
  };

  public func clearTickedHouseItems() : async () {
    houseItems := houseItems.filter(func(item) { not item.purchased });
    touch();
  };

  public query func getDinnerIdeas() : async [DinnerIdea] {
    dinnerIdeas;
  };

  public func addDinnerIdea(id : Text, name : Text, placeSeen : Text, link : Text) : async () {
    let newIdea = {
      id;
      name;
      placeSeen;
      link;
      thisWeek = false;
    };
    dinnerIdeas := dinnerIdeas.concat([newIdea]);
    touch();
  };

  public func toggleDinnerIdeaThisWeek(id : Text) : async () {
    dinnerIdeas := dinnerIdeas.map(func(idea) { if (idea.id == id) { { idea with thisWeek = not idea.thisWeek } } else { idea } });
    touch();
  };

  public func removeDinnerIdea(id : Text) : async () {
    dinnerIdeas := dinnerIdeas.filter(func(idea) { idea.id != id });
    touch();
  };

  public func clearDinnerIdeas() : async () {
    dinnerIdeas := [];
    touch();
  };

  public query func getLunchIdeas() : async [LunchIdea] {
    lunchIdeas;
  };

  public func addLunchIdea(id : Text, name : Text, placeSeen : Text, link : Text) : async () {
    let newIdea = {
      id;
      name;
      placeSeen;
      link;
      thisWeek = false;
    };
    lunchIdeas := lunchIdeas.concat([newIdea]);
    touch();
  };

  public func toggleLunchIdeaThisWeek(id : Text) : async () {
    lunchIdeas := lunchIdeas.map(func(idea) { if (idea.id == id) { { idea with thisWeek = not idea.thisWeek } } else { idea } });
    touch();
  };

  public func removeLunchIdea(id : Text) : async () {
    lunchIdeas := lunchIdeas.filter(func(idea) { idea.id != id });
    touch();
  };

  public func clearLunchIdeas() : async () {
    lunchIdeas := [];
    touch();
  };
};
