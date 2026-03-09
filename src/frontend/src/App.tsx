import type { DinnerIdea, LunchIdea, backendInterface } from "@/backend.d";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import {
  ExternalLink,
  Heart,
  RefreshCw,
  Settings2,
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

const POLL_INTERVAL = 5000;
const NOTIFY_DEBOUNCE_MS = 3000;

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

// ─── Meal key helper ──────────────────────────────────────────────────────────

function mealKey(
  dayIndex: number,
  mealTypeIndex: number,
  personIndex: number,
): string {
  return `${dayIndex}-${mealTypeIndex}-${personIndex}`;
}

// ─── useChangeNotify hook — debounced partner notification ────────────────────

function useChangeNotify(serialised: string, label: string) {
  const stateRef = useRef({
    mounted: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: stateRef is a stable ref, serialised/label are the intentional deps
  useEffect(() => {
    const state = stateRef.current;

    if (!state.mounted) {
      state.mounted = true;
      return;
    }

    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      toast.info(`${label} updated — your partner will be notified`, {
        duration: 4000,
      });
    }, NOTIFY_DEBOUNCE_MS);

    return () => {
      if (state.timer) clearTimeout(state.timer);
    };
  }, [serialised, label]);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const key = mealKey(dayIndex, mealTypeIndex, personIndex);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-adjust height and vertical padding to keep text centred
  const adjustLayout = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to auto so scrollHeight reflects actual content
    el.style.height = "auto";
    const contentH = el.scrollHeight;
    const wrapperH = el.parentElement?.clientHeight ?? 84;
    const targetH = Math.max(contentH, wrapperH);
    el.style.height = `${targetH}px`;
    const vPad = Math.max(8, (wrapperH - contentH) / 2);
    el.style.paddingTop = `${vPad}px`;
    el.style.paddingBottom = `${vPad}px`;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: localValue triggers layout recalc when content changes
  useEffect(() => {
    adjustLayout();
  }, [localValue, adjustLayout]);

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(key, localValue);
    }
  };

  return (
    <div className="meal-input-wrapper">
      <textarea
        ref={textareaRef}
        className="meal-input"
        rows={1}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={`${DAYS[dayIndex]} ${MEAL_TYPES[mealTypeIndex]} for person ${personIndex + 1}`}
        data-ocid={`meal.${dayIndex}.${mealTypeIndex}.${personIndex}.input`}
      />
    </div>
  );
}

// ─── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-botanical">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="text-amber-100/80 text-xl tracking-widest uppercase"
          style={{
            fontFamily: '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
          }}
        >
          Loading…
        </div>
        <div className="w-8 h-0.5 bg-amber-300/50 animate-pulse" />
      </motion.div>
    </div>
  );
}

// ─── Generic list component (used for Shopping List & For the House) ──────────

interface ListPanelProps {
  items: ShoppingItem[];
  title: string;
  ocidPrefix: string;
  toastLabel: string;
  onAdd: (id: string, text: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onClearTicked: () => Promise<void>;
  onOptimisticUpdate: (
    updater: (prev: ShoppingItem[]) => ShoppingItem[],
  ) => void;
}

function ListPanel({
  items,
  title,
  ocidPrefix,
  toastLabel,
  onAdd,
  onToggle,
  onClearAll,
  onClearTicked,
  onOptimisticUpdate,
}: ListPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced partner notification
  useChangeNotify(JSON.stringify(items), toastLabel);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const newItem: ShoppingItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: trimmed,
        purchased: false,
      };
      // Optimistic update
      onOptimisticUpdate((prev) => [...prev, newItem]);
      setInputValue("");
      try {
        await onAdd(newItem.id, newItem.text);
      } catch {
        // Roll back on error
        onOptimisticUpdate((prev) => prev.filter((i) => i.id !== newItem.id));
        toast.error("Could not save — please try again");
      }
    }
  };

  const handleToggle = async (id: string) => {
    // Optimistic update
    onOptimisticUpdate((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item,
      ),
    );
    try {
      await onToggle(id);
    } catch {
      // Roll back on error
      onOptimisticUpdate((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, purchased: !item.purchased } : item,
        ),
      );
      toast.error("Could not save — please try again");
    }
  };

  const handleClearAll = async () => {
    const prevItems = [...items];
    onOptimisticUpdate(() => []);
    try {
      await onClearAll();
      toast.success(`${toastLabel} cleared!`);
    } catch {
      onOptimisticUpdate(() => prevItems);
      toast.error("Could not save — please try again");
    }
  };

  const handleClearTicked = async () => {
    const prevItems = [...items];
    onOptimisticUpdate((prev) => prev.filter((item) => !item.purchased));
    try {
      await onClearTicked();
      toast.success(`Ticked items removed from ${toastLabel.toLowerCase()}!`);
    } catch {
      onOptimisticUpdate(() => prevItems);
      toast.error("Could not save — please try again");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.18 }}
      className="rounded-sm overflow-hidden w-full"
      data-ocid={`${ocidPrefix}.panel`}
    >
      {/* Section Header with action buttons — at the very top */}
      <div className="leopard-bg px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <h2
          className="font-bold text-amber-100 leading-none tracking-tight"
          style={{ fontSize: "clamp(1rem, 3vw, 1.4rem)" }}
        >
          {title}
        </h2>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Clear Ticked */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-sm text-xs text-amber-100/70 hover:bg-black/20 hover:text-amber-100 transition-colors"
                data-ocid={`${ocidPrefix}.clear_ticked_button`}
                aria-label={`Clear ticked items from ${title}`}
              >
                Clear Ticked
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="sm:max-w-md rounded-xl border-border"
              data-ocid={`${ocidPrefix}.clear_ticked.dialog`}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl text-foreground">
                  Remove all ticked items?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will remove all items that have been ticked. Unticked
                  items will be kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  className="rounded-lg"
                  data-ocid={`${ocidPrefix}.clear_ticked.cancel_button`}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearTicked}
                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid={`${ocidPrefix}.clear_ticked.confirm_button`}
                >
                  Remove Ticked
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear All */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-sm text-xs text-amber-100/70 hover:bg-black/20 hover:text-amber-100 transition-colors"
                data-ocid={`${ocidPrefix}.clear_button`}
                aria-label={`Clear all items from ${title}`}
              >
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="sm:max-w-md rounded-xl border-border"
              data-ocid={`${ocidPrefix}.clear.dialog`}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl text-foreground">
                  Clear {title.toLowerCase()}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will remove every item from {title.toLowerCase()}. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  className="rounded-lg"
                  data-ocid={`${ocidPrefix}.clear.cancel_button`}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid={`${ocidPrefix}.clear.confirm_button`}
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Add item input — below the header */}
      <div className="bg-muted/30 px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an item and press Enter…"
          className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
          style={{
            fontFamily: '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
          }}
          data-ocid={`${ocidPrefix}.input`}
          aria-label={`Add item to ${title}`}
        />
      </div>

      {/* Items list */}
      <div className="bg-card/80">
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
                data-ocid={`${ocidPrefix}.item.${index + 1}`}
              >
                <input
                  type="checkbox"
                  checked={item.purchased}
                  onChange={() => handleToggle(item.id)}
                  className="shopping-checkbox"
                  aria-label={`Mark "${item.text}" as done`}
                  data-ocid={`${ocidPrefix}.checkbox.${index + 1}`}
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
      </div>
    </motion.div>
  );
}

// ─── DinnerIdeasPanel ─────────────────────────────────────────────────────────

interface DinnerIdeasPanelProps {
  ideas: DinnerIdea[];
  onAdd: (
    id: string,
    name: string,
    placeSeen: string,
    link: string,
  ) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onOptimisticUpdate: (updater: (prev: DinnerIdea[]) => DinnerIdea[]) => void;
}

function DinnerIdeasPanel({
  ideas,
  onAdd,
  onToggle,
  onRemove,
  onClearAll,
  onOptimisticUpdate,
}: DinnerIdeasPanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  useChangeNotify(JSON.stringify(ideas), "Dinner ideas");

  const thisWeekIdeas = ideas.filter((i) => i.thisWeek);

  const handleAdd = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      nameRef.current?.focus();
      return;
    }
    const newIdea: DinnerIdea = {
      id: `${Date.now()}-${Math.random()}`,
      name: trimmedName,
      placeSeen: placeInput.trim(),
      link: linkInput.trim(),
      thisWeek: false,
    };
    onOptimisticUpdate((prev) => [...prev, newIdea]);
    setNameInput("");
    setPlaceInput("");
    setLinkInput("");
    nameRef.current?.focus();
    try {
      await onAdd(newIdea.id, newIdea.name, newIdea.placeSeen, newIdea.link);
    } catch {
      onOptimisticUpdate((prev) => prev.filter((i) => i.id !== newIdea.id));
      toast.error("Could not save — please try again");
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    isLast: boolean,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isLast) {
        handleAdd();
      } else {
        // Move to next field
        const fields = [nameRef, placeRef, linkRef];
        const currentIndex = fields.findIndex(
          (r) => r.current === e.currentTarget,
        );
        if (currentIndex !== -1 && currentIndex < fields.length - 1) {
          fields[currentIndex + 1].current?.focus();
        }
      }
    }
  };

  const handleToggle = async (id: string) => {
    onOptimisticUpdate((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, thisWeek: !item.thisWeek } : item,
      ),
    );
    try {
      await onToggle(id);
    } catch {
      onOptimisticUpdate((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, thisWeek: !item.thisWeek } : item,
        ),
      );
      toast.error("Could not save — please try again");
    }
  };

  const handleRemove = async (id: string) => {
    const prevIdeas = [...ideas];
    onOptimisticUpdate((prev) => prev.filter((i) => i.id !== id));
    try {
      await onRemove(id);
    } catch {
      onOptimisticUpdate(() => prevIdeas);
      toast.error("Could not save — please try again");
    }
  };

  const handleClearAll = async () => {
    const prevIdeas = [...ideas];
    onOptimisticUpdate(() => []);
    try {
      await onClearAll();
      toast.success("All dinner ideas cleared!");
    } catch {
      onOptimisticUpdate(() => prevIdeas);
      toast.error("Could not save — please try again");
    }
  };

  const didotStyle = {
    fontFamily: '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 }}
      className="flex flex-col gap-2"
      data-ocid="dinner_ideas.panel"
    >
      {/* ── This Week Section ── */}
      <div
        className="rounded-sm overflow-hidden"
        data-ocid="dinner_ideas.this_week.panel"
      >
        <div className="leopard-bg px-4 py-3">
          <h2
            className="font-bold text-amber-100 leading-none tracking-tight"
            style={{ ...didotStyle, fontSize: "clamp(1rem, 3vw, 1.4rem)" }}
          >
            This Week
          </h2>
        </div>
        <div className="bg-card/80">
          <ul className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {thisWeekIdeas.length === 0 && (
                <li
                  className="px-4 py-3 text-foreground/40 text-sm italic"
                  style={didotStyle}
                >
                  No dinners selected for this week yet
                </li>
              )}
              {thisWeekIdeas.map((idea, index) => (
                <motion.li
                  key={idea.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
                  data-ocid={`dinner_ideas.this_week.item.${index + 1}`}
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggle(idea.id)}
                    className="shopping-checkbox"
                    aria-label={`Remove "${idea.name}" from this week`}
                    data-ocid={`dinner_ideas.this_week.checkbox.${index + 1}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm text-foreground font-medium block truncate"
                      style={didotStyle}
                    >
                      {idea.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.placeSeen && (
                        <span
                          className="text-xs text-foreground/50 italic"
                          style={didotStyle}
                        >
                          {idea.placeSeen}
                        </span>
                      )}
                      {idea.link && (
                        <a
                          href={
                            idea.link.startsWith("http")
                              ? idea.link
                              : `https://${idea.link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-300/80 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                          style={didotStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      {/* ── All Ideas Section ── */}
      <div
        className="rounded-sm overflow-hidden"
        data-ocid="dinner_ideas.all_ideas.panel"
      >
        {/* Header with Clear All button */}
        <div className="leopard-bg px-4 py-3 flex items-center justify-between gap-2">
          <h2
            className="font-bold text-amber-100 leading-none tracking-tight"
            style={{ ...didotStyle, fontSize: "clamp(1rem, 3vw, 1.4rem)" }}
          >
            All Ideas
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-sm text-xs text-amber-100/70 hover:bg-black/20 hover:text-amber-100 transition-colors"
                data-ocid="dinner_ideas.clear_button"
                aria-label="Clear all dinner ideas"
              >
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="sm:max-w-md rounded-xl border-border"
              data-ocid="dinner_ideas.clear.dialog"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl text-foreground">
                  Clear all dinner ideas?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will remove every dinner idea including those in This
                  Week. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  className="rounded-lg"
                  data-ocid="dinner_ideas.clear.cancel_button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid="dinner_ideas.clear.confirm_button"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Add idea form */}
        <div className="bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={nameRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Name…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="dinner_ideas.name.input"
              aria-label="Dinner idea name"
            />
            <span className="text-foreground/20 text-xs shrink-0">/</span>
            <input
              ref={placeRef}
              type="text"
              value={placeInput}
              onChange={(e) => setPlaceInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Place seen…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="dinner_ideas.place.input"
              aria-label="Place seen"
            />
            <span className="text-foreground/20 text-xs shrink-0">/</span>
            <input
              ref={linkRef}
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              placeholder="Link…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="dinner_ideas.link.input"
              aria-label="Link"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="shrink-0 w-6 h-6 flex items-center justify-center text-amber-300/70 hover:text-amber-300 transition-colors text-lg leading-none"
              data-ocid="dinner_ideas.add_button"
              aria-label="Add dinner idea"
            >
              +
            </button>
          </div>
        </div>

        {/* All ideas list */}
        <div className="bg-card/80">
          <ul className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {ideas.map((idea, index) => (
                <motion.li
                  key={idea.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
                  data-ocid={`dinner_ideas.item.${index + 1}`}
                >
                  <input
                    type="checkbox"
                    checked={idea.thisWeek}
                    onChange={() => handleToggle(idea.id)}
                    className="shopping-checkbox"
                    aria-label={`${idea.thisWeek ? "Remove" : "Add"} "${idea.name}" ${idea.thisWeek ? "from" : "to"} this week`}
                    data-ocid={`dinner_ideas.checkbox.${index + 1}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm text-foreground font-medium block truncate"
                      style={{
                        ...didotStyle,
                        opacity: idea.thisWeek ? 0.7 : 1,
                      }}
                    >
                      {idea.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.placeSeen && (
                        <span
                          className="text-xs text-foreground/50 italic"
                          style={didotStyle}
                        >
                          {idea.placeSeen}
                        </span>
                      )}
                      {idea.link && (
                        <a
                          href={
                            idea.link.startsWith("http")
                              ? idea.link
                              : `https://${idea.link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-300/80 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                          style={didotStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(idea.id)}
                    className="shrink-0 text-foreground/30 hover:text-destructive transition-colors p-1 rounded"
                    aria-label={`Delete "${idea.name}"`}
                    data-ocid={`dinner_ideas.delete_button.${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ─── LunchIdeasPanel ──────────────────────────────────────────────────────────

interface LunchIdeasPanelProps {
  ideas: LunchIdea[];
  onAdd: (
    id: string,
    name: string,
    placeSeen: string,
    link: string,
  ) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onOptimisticUpdate: (updater: (prev: LunchIdea[]) => LunchIdea[]) => void;
}

function LunchIdeasPanel({
  ideas,
  onAdd,
  onToggle,
  onRemove,
  onClearAll,
  onOptimisticUpdate,
}: LunchIdeasPanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  useChangeNotify(JSON.stringify(ideas), "Lunch ideas");

  const thisWeekIdeas = ideas.filter((i) => i.thisWeek);

  const handleAdd = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      nameRef.current?.focus();
      return;
    }
    const newIdea: LunchIdea = {
      id: `${Date.now()}-${Math.random()}`,
      name: trimmedName,
      placeSeen: placeInput.trim(),
      link: linkInput.trim(),
      thisWeek: false,
    };
    onOptimisticUpdate((prev) => [...prev, newIdea]);
    setNameInput("");
    setPlaceInput("");
    setLinkInput("");
    nameRef.current?.focus();
    try {
      await onAdd(newIdea.id, newIdea.name, newIdea.placeSeen, newIdea.link);
    } catch {
      onOptimisticUpdate((prev) => prev.filter((i) => i.id !== newIdea.id));
      toast.error("Could not save — please try again");
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    isLast: boolean,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isLast) {
        handleAdd();
      } else {
        const fields = [nameRef, placeRef, linkRef];
        const currentIndex = fields.findIndex(
          (r) => r.current === e.currentTarget,
        );
        if (currentIndex !== -1 && currentIndex < fields.length - 1) {
          fields[currentIndex + 1].current?.focus();
        }
      }
    }
  };

  const handleToggle = async (id: string) => {
    onOptimisticUpdate((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, thisWeek: !item.thisWeek } : item,
      ),
    );
    try {
      await onToggle(id);
    } catch {
      onOptimisticUpdate((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, thisWeek: !item.thisWeek } : item,
        ),
      );
      toast.error("Could not save — please try again");
    }
  };

  const handleRemove = async (id: string) => {
    const prevIdeas = [...ideas];
    onOptimisticUpdate((prev) => prev.filter((i) => i.id !== id));
    try {
      await onRemove(id);
    } catch {
      onOptimisticUpdate(() => prevIdeas);
      toast.error("Could not save — please try again");
    }
  };

  const handleClearAll = async () => {
    const prevIdeas = [...ideas];
    onOptimisticUpdate(() => []);
    try {
      await onClearAll();
      toast.success("All lunch ideas cleared!");
    } catch {
      onOptimisticUpdate(() => prevIdeas);
      toast.error("Could not save — please try again");
    }
  };

  const didotStyle = {
    fontFamily: '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 }}
      className="flex flex-col gap-2"
      data-ocid="lunch_ideas.panel"
    >
      {/* ── This Week Section ── */}
      <div
        className="rounded-sm overflow-hidden"
        data-ocid="lunch_ideas.this_week.panel"
      >
        <div className="leopard-bg px-4 py-3">
          <h2
            className="font-bold text-amber-100 leading-none tracking-tight"
            style={{ ...didotStyle, fontSize: "clamp(1rem, 3vw, 1.4rem)" }}
          >
            This Week
          </h2>
        </div>
        <div className="bg-card/80">
          <ul className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {thisWeekIdeas.length === 0 && (
                <li
                  className="px-4 py-3 text-foreground/40 text-sm italic"
                  style={didotStyle}
                >
                  No lunches selected for this week yet
                </li>
              )}
              {thisWeekIdeas.map((idea, index) => (
                <motion.li
                  key={idea.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
                  data-ocid={`lunch_ideas.this_week.item.${index + 1}`}
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggle(idea.id)}
                    className="shopping-checkbox"
                    aria-label={`Remove "${idea.name}" from this week`}
                    data-ocid={`lunch_ideas.this_week.checkbox.${index + 1}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm text-foreground font-medium block truncate"
                      style={didotStyle}
                    >
                      {idea.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.placeSeen && (
                        <span
                          className="text-xs text-foreground/50 italic"
                          style={didotStyle}
                        >
                          {idea.placeSeen}
                        </span>
                      )}
                      {idea.link && (
                        <a
                          href={
                            idea.link.startsWith("http")
                              ? idea.link
                              : `https://${idea.link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-300/80 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                          style={didotStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      {/* ── All Ideas Section ── */}
      <div
        className="rounded-sm overflow-hidden"
        data-ocid="lunch_ideas.all_ideas.panel"
      >
        {/* Header with Clear All button */}
        <div className="leopard-bg px-4 py-3 flex items-center justify-between gap-2">
          <h2
            className="font-bold text-amber-100 leading-none tracking-tight"
            style={{ ...didotStyle, fontSize: "clamp(1rem, 3vw, 1.4rem)" }}
          >
            All Ideas
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-sm text-xs text-amber-100/70 hover:bg-black/20 hover:text-amber-100 transition-colors"
                data-ocid="lunch_ideas.clear_button"
                aria-label="Clear all lunch ideas"
              >
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="sm:max-w-md rounded-xl border-border"
              data-ocid="lunch_ideas.clear.dialog"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl text-foreground">
                  Clear all lunch ideas?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will remove every lunch idea including those in This
                  Week. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  className="rounded-lg"
                  data-ocid="lunch_ideas.clear.cancel_button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid="lunch_ideas.clear.confirm_button"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Add idea form */}
        <div className="bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={nameRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Name…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="lunch_ideas.name.input"
              aria-label="Lunch idea name"
            />
            <span className="text-foreground/20 text-xs shrink-0">/</span>
            <input
              ref={placeRef}
              type="text"
              value={placeInput}
              onChange={(e) => setPlaceInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Place seen…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="lunch_ideas.place.input"
              aria-label="Place seen"
            />
            <span className="text-foreground/20 text-xs shrink-0">/</span>
            <input
              ref={linkRef}
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              placeholder="Link…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground/40 placeholder:italic"
              style={didotStyle}
              data-ocid="lunch_ideas.link.input"
              aria-label="Link"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="shrink-0 w-6 h-6 flex items-center justify-center text-amber-300/70 hover:text-amber-300 transition-colors text-lg leading-none"
              data-ocid="lunch_ideas.add_button"
              aria-label="Add lunch idea"
            >
              +
            </button>
          </div>
        </div>

        {/* All ideas list */}
        <div className="bg-card/80">
          <ul className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {ideas.map((idea, index) => (
                <motion.li
                  key={idea.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
                  data-ocid={`lunch_ideas.item.${index + 1}`}
                >
                  <input
                    type="checkbox"
                    checked={idea.thisWeek}
                    onChange={() => handleToggle(idea.id)}
                    className="shopping-checkbox"
                    aria-label={`${idea.thisWeek ? "Remove" : "Add"} "${idea.name}" ${idea.thisWeek ? "from" : "to"} this week`}
                    data-ocid={`lunch_ideas.checkbox.${index + 1}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm text-foreground font-medium block truncate"
                      style={{
                        ...didotStyle,
                        opacity: idea.thisWeek ? 0.7 : 1,
                      }}
                    >
                      {idea.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.placeSeen && (
                        <span
                          className="text-xs text-foreground/50 italic"
                          style={didotStyle}
                        >
                          {idea.placeSeen}
                        </span>
                      )}
                      {idea.link && (
                        <a
                          href={
                            idea.link.startsWith("http")
                              ? idea.link
                              : `https://${idea.link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-300/80 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                          style={didotStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(idea.id)}
                    className="shrink-0 text-foreground/30 hover:text-destructive transition-colors p-1 rounded"
                    aria-label={`Delete "${idea.name}"`}
                    data-ocid={`lunch_ideas.delete_button.${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { actor: _actor, isFetching } = useActor();
  // Cast to the full backend interface (backend.d.ts is the canonical contract)
  const actor = _actor as unknown as backendInterface | null;

  // ── Data state ─────────────────────────────────────────────────────────────
  const [plan, setPlan] = useState<MealPlan>({
    person1Name: "Husband",
    person2Name: "Wife",
    meals: {},
  });
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [houseItems, setHouseItems] = useState<ShoppingItem[]>([]);
  const [dinnerIdeas, setDinnerIdeas] = useState<DinnerIdea[]>([]);
  const [lunchIdeas, setLunchIdeas] = useState<LunchIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName1, setEditName1] = useState(plan.person1Name);
  const [editName2, setEditName2] = useState(plan.person2Name);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // ── Tracking ───────────────────────────────────────────────────────────────
  // Track the last known lastModified value for change detection
  const lastModifiedRef = useRef<bigint | null>(null);
  // Flag to avoid showing "Updated by your partner" when we made the change
  const localWritePendingRef = useRef(false);

  // Debounced partner notification for the meal plan
  useChangeNotify(JSON.stringify(plan.meals), "Meal plan");

  // ── Initial data load ──────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (actorInstance: backendInterface) => {
    const [mealResult, shopping, house, dinners, lunches] = await Promise.all([
      actorInstance.getMealPlan(),
      actorInstance.getShoppingList(),
      actorInstance.getHouseList(),
      actorInstance.getDinnerIdeas(),
      actorInstance.getLunchIdeas(),
    ]);

    const mealsMap: Record<string, string> = {};
    for (const [key, value] of mealResult.meals) {
      mealsMap[key] = value;
    }

    setPlan({
      person1Name: mealResult.person1Name,
      person2Name: mealResult.person2Name,
      meals: mealsMap,
    });
    setShoppingItems(shopping);
    setHouseItems(house);
    setDinnerIdeas(dinners);
    setLunchIdeas(lunches);
  }, []);

  useEffect(() => {
    if (!actor || isFetching) return;

    let cancelled = false;

    const loadInitial = async () => {
      try {
        // Get initial lastModified and all data in parallel
        const [lastMod] = await Promise.all([
          actor.getLastModified(),
          fetchAllData(actor),
        ]);
        if (!cancelled) {
          lastModifiedRef.current = lastMod;
          setIsLoading(false);
          setLastSynced(new Date());
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load data — please refresh");
          setIsLoading(false);
        }
      }
    };

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, fetchAllData]);

  // ── Polling for remote changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!actor || isLoading) return;

    const poll = async () => {
      try {
        const lastMod = await actor.getLastModified();
        if (lastMod !== lastModifiedRef.current) {
          lastModifiedRef.current = lastMod;
          await fetchAllData(actor);
          setLastSynced(new Date());

          // Only show "Updated by your partner" if the local user didn't just write
          if (!localWritePendingRef.current) {
            toast.info("Updated by your partner", { duration: 3000 });
          }
          localWritePendingRef.current = false;
        }
      } catch {
        // Silently ignore poll errors — will retry next interval
      }
    };

    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [actor, isLoading, fetchAllData]);

  // ── Save a meal ────────────────────────────────────────────────────────────
  const handleSaveMeal = useCallback(
    async (key: string, value: string) => {
      // Optimistic update
      setPlan((prev) => ({
        ...prev,
        meals: { ...prev.meals, [key]: value },
      }));
      localWritePendingRef.current = true;
      try {
        await actor?.setMeal(key, value);
      } catch {
        toast.error("Could not save — please try again");
        // Roll back
        setPlan((prev) => ({
          ...prev,
          meals: { ...prev.meals, [key]: prev.meals[key] ?? "" },
        }));
      }
    },
    [actor],
  );

  // ── Clear week ─────────────────────────────────────────────────────────────
  const handleClearWeek = async () => {
    const prevMeals = { ...plan.meals };
    setPlan((prev) => ({ ...prev, meals: {} }));
    localWritePendingRef.current = true;
    try {
      await actor?.clearMeals();
      toast.success("Week cleared!");
    } catch {
      setPlan((prev) => ({ ...prev, meals: prevMeals }));
      toast.error("Could not save — please try again");
    }
  };

  // ── Settings ───────────────────────────────────────────────────────────────
  const openSettings = () => {
    setEditName1(plan.person1Name);
    setEditName2(plan.person2Name);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const name1 = editName1.trim() || "Person 1";
    const name2 = editName2.trim() || "Person 2";
    setPlan((prev) => ({ ...prev, person1Name: name1, person2Name: name2 }));
    setSettingsOpen(false);
    localWritePendingRef.current = true;
    try {
      await actor?.setNames(name1, name2);
      toast.success("Names updated!");
    } catch {
      toast.error("Could not save — please try again");
    }
  };

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const handleManualRefresh = async () => {
    if (!actor) return;
    try {
      await fetchAllData(actor);
      setLastSynced(new Date());
      toast.success("Refreshed!");
    } catch {
      toast.error("Could not refresh — please try again");
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Shopping list actions ──────────────────────────────────────────────────
  const shoppingActions = {
    onAdd: async (id: string, text: string) => {
      localWritePendingRef.current = true;
      await actor?.addShoppingItem(id, text);
    },
    onToggle: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.toggleShoppingItem(id);
    },
    onClearAll: async () => {
      localWritePendingRef.current = true;
      await actor?.clearShoppingList();
    },
    onClearTicked: async () => {
      localWritePendingRef.current = true;
      await actor?.clearTickedShoppingItems();
    },
    onOptimisticUpdate: (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
      setShoppingItems((prev) => updater(prev));
    },
  };

  // ── House list actions ─────────────────────────────────────────────────────
  const houseActions = {
    onAdd: async (id: string, text: string) => {
      localWritePendingRef.current = true;
      await actor?.addHouseItem(id, text);
    },
    onToggle: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.toggleHouseItem(id);
    },
    onClearAll: async () => {
      localWritePendingRef.current = true;
      await actor?.clearHouseList();
    },
    onClearTicked: async () => {
      localWritePendingRef.current = true;
      await actor?.clearTickedHouseItems();
    },
    onOptimisticUpdate: (updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
      setHouseItems((prev) => updater(prev));
    },
  };

  // ── Dinner ideas actions ───────────────────────────────────────────────────
  const dinnerActions = {
    onAdd: async (
      id: string,
      name: string,
      placeSeen: string,
      link: string,
    ) => {
      localWritePendingRef.current = true;
      await actor?.addDinnerIdea(id, name, placeSeen, link);
    },
    onToggle: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.toggleDinnerIdeaThisWeek(id);
    },
    onRemove: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.removeDinnerIdea(id);
    },
    onClearAll: async () => {
      localWritePendingRef.current = true;
      await actor?.clearDinnerIdeas();
    },
    onOptimisticUpdate: (updater: (prev: DinnerIdea[]) => DinnerIdea[]) => {
      setDinnerIdeas((prev) => updater(prev));
    },
  };

  // ── Lunch ideas actions ────────────────────────────────────────────────────
  const lunchActions = {
    onAdd: async (
      id: string,
      name: string,
      placeSeen: string,
      link: string,
    ) => {
      localWritePendingRef.current = true;
      await actor?.addLunchIdea(id, name, placeSeen, link);
    },
    onToggle: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.toggleLunchIdeaThisWeek(id);
    },
    onRemove: async (id: string) => {
      localWritePendingRef.current = true;
      await actor?.removeLunchIdea(id);
    },
    onClearAll: async () => {
      localWritePendingRef.current = true;
      await actor?.clearLunchIdeas();
    },
    onOptimisticUpdate: (updater: (prev: LunchIdea[]) => LunchIdea[]) => {
      setLunchIdeas((prev) => updater(prev));
    },
  };

  // ── Render loading screen ──────────────────────────────────────────────────
  if (isLoading || !actor) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col page-botanical overflow-x-hidden">
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
      <main className="flex-1 w-full max-w-xl mx-auto px-3 pb-10 flex flex-col overflow-x-hidden">
        {/* ── Tab System ─────────────────────────────────────────────────── */}
        <Tabs
          defaultValue="planner"
          className="flex flex-col flex-1 gap-0 w-full overflow-x-hidden min-w-0 [&>[data-slot=tabs-content]]:mt-0 [&>[data-slot=tabs-content]]:pt-0"
          style={{ gap: 0 }}
        >
          {/* Sticky tab bar — split across 2 rows */}
          <div className="sticky top-0 z-20 pt-2 pb-0 px-1">
            <TabsList className="w-full bg-transparent border-none shadow-none p-0 h-auto gap-0 flex flex-col">
              {/* Row 1: Planner · Dinner Ideas · Lunch Ideas */}
              <div className="flex w-full">
                <TabsTrigger
                  value="planner"
                  className="flex-1 min-w-0 bg-transparent border-none shadow-none rounded-none px-1 py-2 tracking-widest uppercase font-normal text-amber-100/60 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-none data-[state=active]:text-amber-100 data-[state=active]:font-bold transition-all outline-none focus-visible:outline-none ring-0 focus-visible:ring-0"
                  style={{
                    fontFamily:
                      '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
                    fontSize: "0.65rem",
                  }}
                  data-ocid="tabs.planner.tab"
                >
                  Planner
                </TabsTrigger>
                <TabsTrigger
                  value="dinner-ideas"
                  className="flex-1 min-w-0 bg-transparent border-none shadow-none rounded-none px-1 py-2 tracking-widest uppercase font-normal text-amber-100/60 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-none data-[state=active]:text-amber-100 data-[state=active]:font-bold transition-all outline-none focus-visible:outline-none ring-0 focus-visible:ring-0"
                  style={{
                    fontFamily:
                      '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
                    fontSize: "0.65rem",
                  }}
                  data-ocid="tabs.dinner_ideas.tab"
                >
                  Dinner Ideas
                </TabsTrigger>
                <TabsTrigger
                  value="lunch-ideas"
                  className="flex-1 min-w-0 bg-transparent border-none shadow-none rounded-none px-1 py-2 tracking-widest uppercase font-normal text-amber-100/60 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-none data-[state=active]:text-amber-100 data-[state=active]:font-bold transition-all outline-none focus-visible:outline-none ring-0 focus-visible:ring-0"
                  style={{
                    fontFamily:
                      '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
                    fontSize: "0.65rem",
                  }}
                  data-ocid="tabs.lunch_ideas.tab"
                >
                  Lunch Ideas
                </TabsTrigger>
              </div>
              {/* Row 2: Shopping · For the House */}
              <div className="flex w-full">
                <TabsTrigger
                  value="shopping"
                  className="flex-1 min-w-0 bg-transparent border-none shadow-none rounded-none px-1 py-2 tracking-widest uppercase font-normal text-amber-100/60 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-none data-[state=active]:text-amber-100 data-[state=active]:font-bold transition-all outline-none focus-visible:outline-none ring-0 focus-visible:ring-0"
                  style={{
                    fontFamily:
                      '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
                    fontSize: "0.65rem",
                  }}
                  data-ocid="tabs.shopping.tab"
                >
                  Shopping List
                </TabsTrigger>
                <TabsTrigger
                  value="house"
                  className="flex-1 min-w-0 bg-transparent border-none shadow-none rounded-none px-1 py-2 tracking-widest uppercase font-normal text-amber-100/60 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-none data-[state=active]:text-amber-100 data-[state=active]:font-bold transition-all outline-none focus-visible:outline-none ring-0 focus-visible:ring-0"
                  style={{
                    fontFamily:
                      '"GFS Didot", Didot, "Bodoni MT", Georgia, serif',
                    fontSize: "0.65rem",
                  }}
                  data-ocid="tabs.house.tab"
                >
                  For the House
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* ── Planner Tab ── */}
          <TabsContent
            value="planner"
            className="flex flex-col gap-1.5 pt-3 w-full overflow-x-hidden"
          >
            {/* Names header row */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="leopard-bg rounded-sm overflow-hidden w-full"
              data-ocid="meal.table"
            >
              <div className="flex items-stretch w-full">
                {/* Spacer to match the 72px meal-type gutter */}
                <div className="shrink-0" style={{ width: "72px" }} />
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

            {/* Day cards — one per day */}
            {DAYS.map((day, dayIndex) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 + dayIndex * 0.04 }}
                className="rounded-sm overflow-hidden w-full overflow-x-hidden"
                data-ocid={`meal.${dayIndex}.card`}
              >
                {/* Day header — transparent, shows leopard background */}
                <div className="leopard-bg px-3 py-1.5 flex items-center justify-center w-full">
                  <h3
                    className="font-bold text-amber-100 uppercase select-none w-full flex justify-between"
                    style={{ fontSize: "clamp(1rem, 4vw, 1.3rem)" }}
                    aria-label={day}
                  >
                    {day.split("").map((char, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: letters in a fixed string, order never changes
                      <span key={i}>{char}</span>
                    ))}
                  </h3>
                </div>

                {/* Meal rows */}
                <div className="flex flex-col">
                  {MEAL_TYPES.map((mealType, mealTypeIndex) => {
                    const isLast = mealTypeIndex === MEAL_TYPES.length - 1;
                    return (
                      <div
                        key={mealType}
                        className={`flex items-stretch gap-0 w-full min-w-0 ${!isLast ? "border-b border-border/20" : ""}`}
                        data-ocid={`meal.${dayIndex}.${mealTypeIndex}.row`}
                      >
                        {/* Meal icon + label gutter — widened so "Breakfast" fits */}
                        <div
                          className="flex flex-col items-center justify-center gap-0.5 py-2 shrink-0"
                          style={{ width: "72px" }}
                        >
                          <span className="text-base leading-none select-none">
                            {MEAL_ICONS[mealType]}
                          </span>
                          <span className="meal-label">{mealType}</span>
                        </div>

                        {/* Person 1 textarea */}
                        <div className="flex-1 min-w-0 border-l border-border/20">
                          <MealCell
                            dayIndex={dayIndex}
                            mealTypeIndex={mealTypeIndex}
                            personIndex={0}
                            value={
                              plan.meals[mealKey(dayIndex, mealTypeIndex, 0)] ??
                              ""
                            }
                            placeholder={`${mealType}…`}
                            onSave={handleSaveMeal}
                          />
                        </div>

                        {/* Person 2 textarea */}
                        <div className="flex-1 min-w-0 border-l border-border/20">
                          <MealCell
                            dayIndex={dayIndex}
                            mealTypeIndex={mealTypeIndex}
                            personIndex={1}
                            value={
                              plan.meals[mealKey(dayIndex, mealTypeIndex, 1)] ??
                              ""
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
          </TabsContent>

          {/* ── Dinner Ideas Tab ── */}
          <TabsContent
            value="dinner-ideas"
            className="flex flex-col mt-0 pt-0 justify-start items-start"
            style={{ marginTop: 0, paddingTop: 0, gap: 0 }}
          >
            <DinnerIdeasPanel ideas={dinnerIdeas} {...dinnerActions} />
          </TabsContent>

          {/* ── Lunch Ideas Tab ── */}
          <TabsContent
            value="lunch-ideas"
            className="flex flex-col mt-0 pt-0 justify-start items-start"
            style={{ marginTop: 0, paddingTop: 0, gap: 0 }}
          >
            <LunchIdeasPanel ideas={lunchIdeas} {...lunchActions} />
          </TabsContent>

          {/* ── Shopping List Tab ── */}
          <TabsContent
            value="shopping"
            className="flex flex-col mt-0 pt-0 justify-start items-start"
            style={{ marginTop: 0, paddingTop: 0, gap: 0 }}
          >
            <ListPanel
              items={shoppingItems}
              title="Shopping List"
              ocidPrefix="shopping"
              toastLabel="Shopping list"
              {...shoppingActions}
            />
          </TabsContent>

          {/* ── For the House Tab ── */}
          <TabsContent
            value="house"
            className="flex flex-col mt-0 pt-0 justify-start items-start"
            style={{ marginTop: 0, paddingTop: 0, gap: 0 }}
          >
            <ListPanel
              items={houseItems}
              title="For the House"
              ocidPrefix="house"
              toastLabel="House list"
              {...houseActions}
            />
          </TabsContent>
        </Tabs>
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
