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

  // Legacy type (no recipe field) — kept so the existing stable var
  // `dinnerIdeas`/`lunchIdeas` compiles without a type-mismatch error.
  type DinnerIdeaV1 = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    thisWeek : Bool;
  };

  type LunchIdeaV1 = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    thisWeek : Bool;
  };

  // Current type
  type DinnerIdea = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    recipe : Text;
    thisWeek : Bool;
  };

  type LunchIdea = {
    id : Text;
    name : Text;
    placeSeen : Text;
    link : Text;
    recipe : Text;
    thisWeek : Bool;
  };

  var person1Name : Text = "Husband";
  var person2Name : Text = "Wife";
  var mealEntries : [MealEntry] = [];
  var shoppingItems : [ShoppingItem] = [];
  var houseItems : [ShoppingItem] = [];

  // Legacy stable vars — type kept as V1 so the upgrade is compatible.
  // Data is migrated to *V2 vars on first postupgrade and then cleared.
  var dinnerIdeas : [DinnerIdeaV1] = [];
  var lunchIdeas : [LunchIdeaV1] = [];

  // Current stable vars with recipe field
  stable var dinnerIdeasV2 : [DinnerIdea] = [];
  stable var lunchIdeasV2 : [LunchIdea] = [];

  var lastModified : Int = 0;

  // One-time migration: copy V1 records into V2, adding recipe = ""
  system func postupgrade() {
    if (dinnerIdeasV2.size() == 0 and dinnerIdeas.size() > 0) {
      dinnerIdeasV2 := dinnerIdeas.map(func(old : DinnerIdeaV1) : DinnerIdea {
        { id = old.id; name = old.name; placeSeen = old.placeSeen;
          link = old.link; recipe = ""; thisWeek = old.thisWeek }
      });
      dinnerIdeas := [];
    };
    if (lunchIdeasV2.size() == 0 and lunchIdeas.size() > 0) {
      lunchIdeasV2 := lunchIdeas.map(func(old : LunchIdeaV1) : LunchIdea {
        { id = old.id; name = old.name; placeSeen = old.placeSeen;
          link = old.link; recipe = ""; thisWeek = old.thisWeek }
      });
      lunchIdeas := [];
    };
  };

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
    shoppingItems := shoppingItems.map(func(item) {
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
    houseItems := houseItems.map(func(item) {
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
    houseItems := houseItems.filter(func(item) { not item.purchased });
    touch();
  };

  public query func getDinnerIdeas() : async [DinnerIdea] {
    dinnerIdeasV2;
  };

  public func addDinnerIdea(id : Text, name : Text, placeSeen : Text, link : Text, recipe : Text) : async () {
    dinnerIdeasV2 := dinnerIdeasV2.concat([{ id; name; placeSeen; link; recipe; thisWeek = false }]);
    touch();
  };

  public func updateDinnerIdeaRecipe(id : Text, recipe : Text) : async () {
    dinnerIdeasV2 := dinnerIdeasV2.map(func(idea) {
      if (idea.id == id) { { idea with recipe } } else { idea }
    });
    touch();
  };

  public func toggleDinnerIdeaThisWeek(id : Text) : async () {
    dinnerIdeasV2 := dinnerIdeasV2.map(func(idea) {
      if (idea.id == id) { { idea with thisWeek = not idea.thisWeek } } else { idea }
    });
    touch();
  };

  public func removeDinnerIdea(id : Text) : async () {
    dinnerIdeasV2 := dinnerIdeasV2.filter(func(idea) { idea.id != id });
    touch();
  };

  public func clearDinnerIdeas() : async () {
    dinnerIdeasV2 := [];
    touch();
  };

  public query func getLunchIdeas() : async [LunchIdea] {
    lunchIdeasV2;
  };

  public func addLunchIdea(id : Text, name : Text, placeSeen : Text, link : Text, recipe : Text) : async () {
    lunchIdeasV2 := lunchIdeasV2.concat([{ id; name; placeSeen; link; recipe; thisWeek = false }]);
    touch();
  };

  public func updateLunchIdeaRecipe(id : Text, recipe : Text) : async () {
    lunchIdeasV2 := lunchIdeasV2.map(func(idea) {
      if (idea.id == id) { { idea with recipe } } else { idea }
    });
    touch();
  };

  public func toggleLunchIdeaThisWeek(id : Text) : async () {
    lunchIdeasV2 := lunchIdeasV2.map(func(idea) {
      if (idea.id == id) { { idea with thisWeek = not idea.thisWeek } } else { idea }
    });
    touch();
  };

  public func removeLunchIdea(id : Text) : async () {
    lunchIdeasV2 := lunchIdeasV2.filter(func(idea) { idea.id != id });
    touch();
  };

  public func clearLunchIdeas() : async () {
    lunchIdeasV2 := [];
    touch();
  };
};
