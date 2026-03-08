import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  Heart,
  RefreshCw,
  Settings2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MealPlan {
  person1Name: string;
  person2Name: string;
  meals: Record<string, string>;
}

interface ShoppingItem {
  id: string;
  text: string;
  purchased: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "mealPlan";
const SHOPPING_KEY = "shoppingList";
const POLL_INTERVAL = 5000;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

const MEAL_ICONS: Record<string, string> = {
  Breakfast: "🕯️",
  Lunch: "🦇",
  Dinner: "💀",
  Snack: "🥀",
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadMealPlan(): MealPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MealPlan>;
      return {
        person1Name: parsed.person1Name ?? "Husband",
        person2Name: parsed.person2Name ?? "Wife",
        meals: parsed.meals ?? {},
      };
    }
  } catch {
    // ignore parse errors
  }
  return { person1Name: "Husband", person2Name: "Wife", meals: {} };
}

function saveMealPlan(plan: MealPlan): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

function loadShoppingList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_KEY);
    if (raw) {
      return JSON.parse(raw) as ShoppingItem[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveShoppingList(items: ShoppingItem[]): void {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
}

// ─── Meal key helper ──────────────────────────────────────────────────────────

function mealKey(
  dayIndex: number,
  mealTypeIndex: number,
  personIndex: number,
): string {
  return `${dayIndex}-${mealTypeIndex}-${personIndex}`;
}

// ─── MealCell component (textarea, 3 rows) ────────────────────────────────────

interface MealCellProps {
  dayIndex: number;
  mealTypeIndex: number;
  personIndex: number;
  value: string;
  placeholder: string;
  onSave: (key: string, value: string) => void;
}

function MealCell({
  dayIndex,
  mealTypeIndex,
  personIndex,
  value,
  placeholder,
  onSave,
}: MealCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const key = mealKey(dayIndex, mealTypeIndex, personIndex);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(key, localValue);
    }
  };

  return (
    <textarea
      className="meal-input"
      rows={3}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label={`${DAYS[dayIndex]} ${MEAL_TYPES[mealTypeIndex]} for person ${personIndex + 1}`}
      data-ocid={`meal.${dayIndex}.${mealTypeIndex}.${personIndex}.input`}
    />
  );
}

// ─── ShoppingList component ───────────────────────────────────────────────────

function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(loadShoppingList);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const newItem: ShoppingItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: trimmed,
        purchased: false,
      };
      setItems((prev) => {
        const updated = [...prev, newItem];
        saveShoppingList(updated);
        return updated;
      });
      setInputValue("");
    }
  };

  const togglePurchased = (id: string) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item,
      );
      saveShoppingList(updated);
      return updated;
    });
  };

  const handleClearAll = () => {
    setItems([]);
    saveShoppingList([]);
    toast.success("Shopping list cleared!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.18 }}
      className="rounded-sm overflow-hidden"
      data-ocid="shopping.panel"
    >
      {/* Section Header — leopard print */}
      <div className="leopard-bg px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-amber-100" />
          <h2
            className="font-bold text-amber-100 leading-none tracking-tight"
            style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)" }}
          >
            Shopping List
          </h2>
        </div>

        {/* Ornamental motif */}
        <span className="text-amber-200/60 text-lg select-none">❧</span>

        {/* Clear All */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 rounded-sm text-xs text-amber-100/70 hover:bg-black/20 hover:text-amber-100 gap-1.5 transition-colors"
              data-ocid="shopping.clear_button"
              aria-label="Clear shopping list"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            className="sm:max-w-md rounded-xl border-border"
            data-ocid="shopping.clear.dialog"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl text-foreground">
                Clear the shopping list?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will remove all items from your shopping list. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel
                className="rounded-lg"
                data-ocid="shopping.clear.cancel_button"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-ocid="shopping.clear.confirm_button"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Add item input */}
      <div className="bg-muted/30 px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an item and press Enter…"
          className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          data-ocid="shopping.input"
          aria-label="Add shopping list item"
        />
      </div>

      {/* Items list */}
      <div className="bg-card/80">
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center py-10 px-4"
            data-ocid="shopping.empty_state"
          >
            <p className="text-sm text-foreground/40 italic">
              Your list is empty
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5 ${item.purchased ? "shopping-item-purchased" : ""}`}
                  data-ocid={`shopping.item.${index + 1}`}
                >
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={() => togglePurchased(item.id)}
                    className="shopping-checkbox"
                    aria-label={`Mark "${item.text}" as purchased`}
                    data-ocid={`shopping.checkbox.${index + 1}`}
                  />
                  <span
                    className="shopping-item-text text-sm flex-1 select-text cursor-default"
                    style={{
                      textDecoration: item.purchased ? "line-through" : "none",
                      opacity: item.purchased ? 0.45 : 1,
                      color: item.purchased
                        ? "oklch(var(--muted-foreground))"
                        : "oklch(var(--foreground))",
                      transition: "opacity 0.2s ease, color 0.2s ease",
                    }}
                  >
                    {item.text}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [plan, setPlan] = useState<MealPlan>(loadMealPlan);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName1, setEditName1] = useState(plan.person1Name);
  const [editName2, setEditName2] = useState(plan.person2Name);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const prevPlanRef = useRef<string>(JSON.stringify(plan));

  // ── Polling ──────────────────────────────────────────────────────────────
  const poll = useCallback(() => {
    const fresh = loadMealPlan();
    const freshStr = JSON.stringify(fresh);
    if (freshStr !== prevPlanRef.current) {
      setPlan(fresh);
      prevPlanRef.current = freshStr;
      setLastSynced(new Date());
    }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  // ── Save a meal ────────────────────────────────────────────────────────────
  const handleSaveMeal = useCallback((key: string, value: string) => {
    setPlan((prev) => {
      const updated: MealPlan = {
        ...prev,
        meals: { ...prev.meals, [key]: value },
      };
      saveMealPlan(updated);
      prevPlanRef.current = JSON.stringify(updated);
      return updated;
    });
  }, []);

  // ── Clear week ─────────────────────────────────────────────────────────────
  const handleClearWeek = () => {
    setPlan((prev) => {
      const updated: MealPlan = { ...prev, meals: {} };
      saveMealPlan(updated);
      prevPlanRef.current = JSON.stringify(updated);
      return updated;
    });
    toast.success("Week cleared!");
  };

  // ── Settings ───────────────────────────────────────────────────────────────
  const openSettings = () => {
    setEditName1(plan.person1Name);
    setEditName2(plan.person2Name);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const name1 = editName1.trim() || "Person 1";
    const name2 = editName2.trim() || "Person 2";
    const updated: MealPlan = {
      ...plan,
      person1Name: name1,
      person2Name: name2,
    };
    saveMealPlan(updated);
    prevPlanRef.current = JSON.stringify(updated);
    setPlan(updated);
    setSettingsOpen(false);
    toast.success("Names updated!");
  };

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const handleManualRefresh = () => {
    poll();
    setLastSynced(new Date());
    toast.success("Refreshed!");
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen flex flex-col page-botanical">
      <Toaster position="top-right" />

      {/* ── Utility bar ────────────────────────────────────────────────── */}
      <div className="bg-primary/40">
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 text-xs text-foreground/50">
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Syncs every 5s · </span>
            <span>Last updated {formatTime(lastSynced)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              className="sm:hidden rounded-full w-8 h-8 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {/* Clear Week */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 rounded-sm text-xs text-foreground/60 hover:bg-foreground/10 hover:text-foreground gap-1.5 transition-colors"
                  data-ocid="header.clear_week_button"
                  aria-label="Clear week"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                className="sm:max-w-md rounded-xl border-border"
                data-ocid="clear.dialog"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl text-foreground">
                    Clear the whole week?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will remove all planned meals. Your names will be kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel
                    className="rounded-lg"
                    data-ocid="clear.cancel_button"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearWeek}
                    className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-ocid="clear.confirm_button"
                  >
                    Clear Week
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Names / Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openSettings}
              className="h-7 px-3 rounded-sm text-xs text-foreground/60 hover:bg-foreground/10 hover:text-foreground gap-1.5 transition-colors"
              data-ocid="header.settings_button"
              aria-label="Settings"
            >
              <Settings2 className="w-3 h-3" />
              <span>Names</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-xl mx-auto px-3 py-5 pb-10 flex flex-col gap-4">
        {/* ── Names header row — leopard print ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="leopard-bg rounded-sm overflow-hidden"
          data-ocid="meal.table"
        >
          <div className="flex items-stretch">
            {/* Person 1 name */}
            <div className="flex-1 flex items-center justify-center px-3 py-4 border-r border-black/20">
              <span
                className="font-bold tracking-tight text-amber-100 text-center leading-tight"
                style={{ fontSize: "clamp(1.1rem, 4vw, 1.6rem)" }}
              >
                {plan.person1Name}
              </span>
            </div>
            {/* Ornamental centre divider */}
            <div className="flex items-center px-2 text-amber-200/70 select-none text-xl">
              ✦
            </div>
            {/* Person 2 name */}
            <div className="flex-1 flex items-center justify-center px-3 py-4 border-l border-black/20">
              <span
                className="font-bold tracking-tight text-amber-100 text-center leading-tight"
                style={{ fontSize: "clamp(1.1rem, 4vw, 1.6rem)" }}
              >
                {plan.person2Name}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Day cards — one per day ── */}
        {DAYS.map((day, dayIndex) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 + dayIndex * 0.04 }}
            className="rounded-sm overflow-hidden"
            data-ocid={`meal.${dayIndex}.card`}
          >
            {/* Day header — leopard print, horizontal text */}
            <div className="leopard-bg px-4 py-2.5 flex items-center justify-center">
              <h3
                className="font-bold tracking-widest text-amber-100 uppercase text-center select-none"
                style={{
                  fontSize: "clamp(0.85rem, 2.5vw, 1.05rem)",
                  letterSpacing: "0.18em",
                }}
              >
                {day}
              </h3>
            </div>

            {/* Meal rows */}
            <div className="flex flex-col">
              {MEAL_TYPES.map((mealType, mealTypeIndex) => {
                const isLast = mealTypeIndex === MEAL_TYPES.length - 1;
                return (
                  <div
                    key={mealType}
                    className={`flex items-start gap-0 ${!isLast ? "border-b border-border/20" : ""}`}
                    data-ocid={`meal.${dayIndex}.${mealTypeIndex}.row`}
                  >
                    {/* Meal icon + label gutter */}
                    <div
                      className="flex flex-col items-center justify-start gap-0.5 pt-2.5 pb-2 shrink-0"
                      style={{ width: "52px" }}
                    >
                      <span className="text-base leading-none select-none">
                        {MEAL_ICONS[mealType]}
                      </span>
                      <span className="meal-label">{mealType}</span>
                    </div>

                    {/* Person 1 textarea */}
                    <div className="flex-1 border-l border-border/20">
                      <MealCell
                        dayIndex={dayIndex}
                        mealTypeIndex={mealTypeIndex}
                        personIndex={0}
                        value={
                          plan.meals[mealKey(dayIndex, mealTypeIndex, 0)] ?? ""
                        }
                        placeholder={`${mealType}…`}
                        onSave={handleSaveMeal}
                      />
                    </div>

                    {/* Person 2 textarea */}
                    <div className="flex-1 border-l border-border/20">
                      <MealCell
                        dayIndex={dayIndex}
                        mealTypeIndex={mealTypeIndex}
                        personIndex={1}
                        value={
                          plan.meals[mealKey(dayIndex, mealTypeIndex, 1)] ?? ""
                        }
                        placeholder={`${mealType}…`}
                        onSave={handleSaveMeal}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* ── Shopping List ── */}
        <ShoppingList />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/30 bg-card/20 py-5 text-center">
        <p className="text-xs text-foreground/40">
          © {new Date().getFullYear()} · Built with{" "}
          <Heart className="inline w-3 h-3 text-accent fill-accent" /> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* ── Settings Dialog ─────────────────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          data-ocid="settings.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-xl">Planner Names</DialogTitle>
            <DialogDescription>
              Set the names shown at the top of the planner.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="person1" className="font-medium text-sm">
                Person 1 Name
              </Label>
              <Input
                id="person1"
                value={editName1}
                onChange={(e) => setEditName1(e.target.value)}
                placeholder="e.g. Alex"
                data-ocid="settings.person1.input"
                onKeyDown={(e) => e.key === "Enter" && saveSettings()}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="person2" className="font-medium text-sm">
                Person 2 Name
              </Label>
              <Input
                id="person2"
                value={editName2}
                onChange={(e) => setEditName2(e.target.value)}
                placeholder="e.g. Sam"
                data-ocid="settings.person2.input"
                onKeyDown={(e) => e.key === "Enter" && saveSettings()}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="rounded-lg"
              data-ocid="settings.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="settings.save_button"
            >
              Save Names
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
