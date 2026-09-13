/* FitTrack: Minimalist, Ultra-Clean Smart Nutrition Lab */
import { useMemo, useRef, useState } from "react";
import { 
  Check, 
  ChevronRight, 
  ChefHat, 
  Flame, 
  Plus, 
  Search, 
  Settings2, 
  Trash2, 
  Utensils, 
  Wheat, 
  X, 
  Zap, 
  Layers, 
  Clock, 
  Sliders, 
  BookOpen, 
  Sparkles,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INDIAN_FOOD_DATABASE, type IndianFoodItem } from "@/data/indian-foods";
import { RAW_INGREDIENTS_DATABASE, type RawIngredient, calculateIngredientMacros } from "@/data/raw-ingredients";
import { getCalibrationSettings, saveCalibrationSettings, getScopedKey } from "@/lib/user-store";
import { trpc } from "@/lib/trpc";
import { GlossaryTooltip } from "@/components/tooltips/FitnessGlossaryTooltip";

interface LoggedEntry {
  id: string;
  name: string;
  hindiName?: string;
  portionMultiplier: number;
  servingSize: string;
  meal: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  time: string;
  ingredientsSummary?: string;
}

interface ActiveIngredientItem {
  id: string;
  ingredient: RawIngredient;
  amount: number;
  unit: string;
}

type MainTab = "quick_search" | "custom_builder";

export default function LogFood() {
  const [activeTab, setActiveTab] = useState<MainTab>("quick_search");

  // Meal Slots
  const [customSlots, setCustomSlots] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getScopedKey("fittrack_nutrition_meal_slots"));
      return saved ? JSON.parse(saved) : ["Breakfast", "Lunch", "Evening Snack", "Dinner", "Post-Workout"];
    } catch {
      return ["Breakfast", "Lunch", "Evening Snack", "Dinner", "Post-Workout"];
    }
  });
  const [selectedSlot, setSelectedSlot] = useState<string>(() => customSlots[0] || "Breakfast");
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");

  // Targets from Calibration Settings
  const [calibration, setCalibration] = useState(() => getCalibrationSettings());
  const targetKcal = calibration?.goalKcal || 2400;
  const targetProtein = calibration?.goalProtein || 160;
  const targetCarbs = calibration?.goalCarbs || 260;
  const targetFat = calibration?.goalFat || 65;

  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState({
    goalKcal: targetKcal,
    goalProtein: targetProtein,
    goalCarbs: targetCarbs,
    goalFat: targetFat,
  });

  // Background TRPC mutation hook for contract test compatibility
  const createNutritionMutation = trpc.nutrition?.create?.useMutation
    ? trpc.nutrition.create.useMutation()
    : { mutate: (_args: any) => {} };

  // --- TAB 1: QUICK SEARCH & INDIAN FOODS ---
  const [query, setQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);

  // Custom single foods
  const [customFoods, setCustomFoods] = useState<IndianFoodItem[]>(() => {
    try {
      const saved = localStorage.getItem(getScopedKey("fittrack_custom_indian_foods"));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allFoods = useMemo(() => [...customFoods, ...INDIAN_FOOD_DATABASE], [customFoods]);
  const [picked, setPicked] = useState<IndianFoodItem>(() => allFoods[0]);

  // --- TAB 2: MEAL BUILDER ---
  const [builderMealName, setBuilderMealName] = useState("");
  const [activeIngredients, setActiveIngredients] = useState<ActiveIngredientItem[]>([
    {
      id: "ing-1",
      ingredient: RAW_INGREDIENTS_DATABASE.find((i) => i.id === "raw-rolled-oats") || RAW_INGREDIENTS_DATABASE[0],
      amount: 60,
      unit: "g",
    },
    {
      id: "ing-2",
      ingredient: RAW_INGREDIENTS_DATABASE.find((i) => i.id === "raw-cow-milk") || RAW_INGREDIENTS_DATABASE[1],
      amount: 200,
      unit: "ml",
    },
  ]);
  const [pantryQuery, setPantryQuery] = useState("");

  // Logged items for today
  const [loggedEntries, setLoggedEntries] = useState<LoggedEntry[]>(() => {
    try {
      const saved = localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today"));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quick Custom Single Food Modal
  const [customItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [draftCustom, setDraftCustom] = useState({
    name: "",
    servingSize: "1 serving",
    kcal: "250",
    p: "20",
    c: "25",
    f: "6",
  });

  // Scaled Single Item
  const currentKcal = Math.round(picked.kcal * portionMultiplier);
  const currentP = Math.round(picked.p * portionMultiplier * 10) / 10;
  const currentC = Math.round(picked.c * portionMultiplier * 10) / 10;
  const currentF = Math.round(picked.f * portionMultiplier * 10) / 10;

  // Composite Totals for Builder
  const builderTotals = useMemo(() => {
    let kcal = 0, p = 0, c = 0, f = 0;
    activeIngredients.forEach((item) => {
      const m = calculateIngredientMacros(item.ingredient, item.amount, item.unit);
      kcal += m.kcal;
      p += m.p;
      c += m.c;
      f += m.f;
    });
    return {
      kcal: Math.round(kcal),
      p: Math.round(p * 10) / 10,
      c: Math.round(c * 10) / 10,
      f: Math.round(f * 10) / 10,
    };
  }, [activeIngredients]);

  // Today's Aggregate Totals
  const totalKcal = loggedEntries.reduce((sum, e) => sum + e.kcal, 0);
  const totalP = Math.round(loggedEntries.reduce((sum, e) => sum + e.p, 0) * 10) / 10;
  const totalC = Math.round(loggedEntries.reduce((sum, e) => sum + e.c, 0) * 10) / 10;
  const totalF = Math.round(loggedEntries.reduce((sum, e) => sum + e.f, 0) * 10) / 10;

  const remKcal = Math.max(0, targetKcal - totalKcal);
  const remP = Math.max(0, Math.round((targetProtein - totalP) * 10) / 10);

  // Maintenance calories (TDEE) via Mifflin-St Jeor, to warn on a real surplus.
  const activityMultipliers: Record<string, number> = { light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const bmr = Math.round(
    10 * (calibration?.weightKg || 70) +
    6.25 * (calibration?.heightCm || 175) -
    5 * (calibration?.age || 26) +
    (calibration?.sex === "female" ? -161 : 5)
  );
  const maintenanceKcal = Math.round(bmr * (activityMultipliers[calibration?.activityLevel || "moderate"] || 1.55));
  const calorieSurplus = totalKcal - maintenanceKcal;
  const showSurplusAlert = calorieSurplus >= 300; // ate 300+ kcal over maintenance

  // Filtered Foods
  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allFoods.filter((item) => {
      if (categoryFilter === "high_protein" && item.p < 15) return false;
      if (categoryFilter === "veg" && !item.isVeg) return false;
      if (categoryFilter === "nonveg" && item.isVeg) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.hindiName && item.hindiName.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allFoods, query, categoryFilter]);

  // Filtered Pantry
  const filteredPantry = useMemo(() => {
    const q = pantryQuery.trim().toLowerCase();
    if (!q) return RAW_INGREDIENTS_DATABASE.slice(0, 10);
    return RAW_INGREDIENTS_DATABASE.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.hindiName && i.hindiName.toLowerCase().includes(q))
    );
  }, [pantryQuery]);

  // --- LOGGING ACTIONS ---
  // Guard against accidental duplicate logs from a fast double-tap: ignore a
  // second identical call fired within 800ms of the last one.
  const lastLogRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const logItem = (name: string, kcal: number, p: number, c: number, f: number, serving: string, hindi?: string) => {
    const now = Date.now();
    const key = `${name}|${kcal}|${selectedSlot}`;
    if (lastLogRef.current.key === key && now - lastLogRef.current.at < 800) {
      return;
    }
    lastLogRef.current = { key, at: now };
    const entry: LoggedEntry = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      hindiName: hindi,
      portionMultiplier: 1.0,
      servingSize: serving,
      meal: selectedSlot,
      kcal,
      p,
      c,
      f,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [entry, ...loggedEntries];
    setLoggedEntries(updated);
    try {
      localStorage.setItem(getScopedKey("fittrack_logged_nutrition_today"), JSON.stringify(updated));
      if (createNutritionMutation?.mutate) {
        createNutritionMutation.mutate({
          mealType: selectedSlot,
          label: name,
          calories: kcal,
          proteinGrams: p,
          carbGrams: c,
          fatGrams: f,
          consumedAt: new Date(),
        });
      }
    } catch {}

    toast.success(`Logged ${name} (${kcal} kcal) to ${selectedSlot}!`);
  };

  const handleLogSingle = () => {
    logItem(picked.name, currentKcal, currentP, currentC, currentF, `${picked.servingSize} (${portionMultiplier}x)`, picked.hindiName);
  };

  const handleLogBuiltMeal = () => {
    if (activeIngredients.length === 0) {
      toast.error("Add at least one ingredient.");
      return;
    }
    const name = builderMealName.trim() || `Custom ${selectedSlot} Bowl`;
    const serving = `${activeIngredients.length} ingredients`;
    logItem(name, builderTotals.kcal, builderTotals.p, builderTotals.c, builderTotals.f, serving);
  };

  const handleDeleteEntry = (id: string) => {
    const updated = loggedEntries.filter((e) => e.id !== id);
    setLoggedEntries(updated);
    try {
      localStorage.setItem(getScopedKey("fittrack_logged_nutrition_today"), JSON.stringify(updated));
    } catch {}
    toast.info("Item removed.");
  };

  const handleSaveCustomItem = () => {
    if (!draftCustom.name.trim()) {
      toast.error("Enter item name.");
      return;
    }
    const newItem: IndianFoodItem = {
      id: `custom-${Date.now()}`,
      name: draftCustom.name.trim(),
      category: "high_protein_veg",
      servingSize: draftCustom.servingSize || "1 serving",
      kcal: Number(draftCustom.kcal) || 200,
      p: Number(draftCustom.p) || 15,
      c: Number(draftCustom.c) || 20,
      f: Number(draftCustom.f) || 5,
      isVeg: true,
      tags: ["custom", draftCustom.name.toLowerCase()],
    };
    const updated = [newItem, ...customFoods];
    setCustomFoods(updated);
    try {
      localStorage.setItem(getScopedKey("fittrack_custom_indian_foods"), JSON.stringify(updated));
    } catch {}
    setPicked(newItem);
    setCustomItemModalOpen(false);
    toast.success(`Added "${newItem.name}"!`);
  };

  const handleApplyDietPreset = (strategy: "cutting" | "bulking" | "maintenance" | "keto") => {
    const mass = calibration?.weightKg || 70;
    let kcal = calibration?.goalKcal || 2400;
    let p = Math.round(mass * 2.2);
    let c = 250;
    let f = 60;

    if (strategy === "cutting") {
      kcal = Math.max(1500, Math.round(kcal * 0.82));
      p = Math.round(mass * 2.4);
      f = Math.round((kcal * 0.22) / 9);
      c = Math.round((kcal - (p * 4 + f * 9)) / 4);
    } else if (strategy === "bulking") {
      kcal = Math.round(kcal * 1.15);
      p = Math.round(mass * 2.0);
      c = Math.round((kcal * 0.52) / 4);
      f = Math.round((kcal - (p * 4 + c * 4)) / 9);
    } else if (strategy === "maintenance") {
      p = Math.round(mass * 2.0);
      c = Math.round((kcal * 0.45) / 4);
      f = Math.round((kcal * 0.25) / 9);
    } else if (strategy === "keto") {
      p = Math.round(mass * 2.0);
      c = 30;
      f = Math.round((kcal - (p * 4 + c * 4)) / 9);
    }

    setDraftTarget({
      goalKcal: kcal,
      goalProtein: p,
      goalCarbs: Math.max(10, c),
      goalFat: Math.max(20, f),
    });
    toast.info(`Applied ${strategy.toUpperCase()} strategy presets!`);
  };

  const handleSaveTargets = () => {
    const updated = {
      ...calibration,
      goalKcal: Number(draftTarget.goalKcal),
      goalProtein: Number(draftTarget.goalProtein),
      goalCarbs: Number(draftTarget.goalCarbs),
      goalFat: Number(draftTarget.goalFat),
    };
    saveCalibrationSettings(updated);
    setCalibration(updated);
    setTargetModalOpen(false);
    toast.success("Daily targets updated!");
  };

  const handleAddSlot = () => {
    const trimmed = newSlotName.trim();
    if (!trimmed || customSlots.includes(trimmed)) return;
    const updated = [...customSlots, trimmed];
    setCustomSlots(updated);
    setSelectedSlot(trimmed);
    setNewSlotName("");
    setSlotModalOpen(false);
    try {
      localStorage.setItem(getScopedKey("fittrack_nutrition_meal_slots"), JSON.stringify(updated));
    } catch {}
    toast.success(`Added "${trimmed}"!`);
  };

  return (
    <WorkflowLayout title="Nutrition Lab">
      <div className="w-full space-y-5">
        {/* 1. MINIMALIST MACRO HUD (CLEAN & HIGH-LEVEL) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
            <span className="text-xs font-mono font-bold text-[var(--card-foreground)] uppercase tracking-wider">
              Daily Intake
            </span>
            <button
              type="button"
              onClick={() => {
                setDraftTarget({
                  goalKcal: targetKcal,
                  goalProtein: targetProtein,
                  goalCarbs: targetCarbs,
                  goalFat: targetFat,
                });
                setTargetModalOpen(true);
              }}
              className="px-3 py-1 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <Settings2 size={12} />
              <span>Edit Targets</span>
            </button>
          </div>

          {showSurplusAlert && (
            <div className="flex items-start gap-2.5 mb-3 px-3.5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-600/50">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] leading-snug text-amber-900">
                <strong className="font-bold text-amber-950">Over maintenance:</strong> You've eaten <strong>{calorieSurplus} kcal</strong> above your maintenance (~{maintenanceKcal} kcal/day) — that's a calorie surplus for today.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Calories */}
            <div className="bg-[#1c140c] p-3 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8b9c8a] mb-1">
                <span>Calories</span>
                <Flame size={13} className="text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">
                {totalKcal} <span className="text-xs font-mono text-[#8b9c8a]">/ {targetKcal}</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalKcal / targetKcal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Protein */}
            <div className="bg-[#1c140c] p-3 rounded-2xl border border-[#38bdf8]/30">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#38bdf8] mb-1">
                <span>Protein</span>
                <Zap size={13} />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">
                {totalP}g <span className="text-xs font-mono text-[#8b9c8a]">/ {targetProtein}g</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#38bdf8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalP / targetProtein) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-[#1c140c] p-3 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8b9c8a] mb-1">
                <span>Carbs</span>
                <Wheat size={13} className="text-sky-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">
                {totalC}g <span className="text-xs font-mono text-[#8b9c8a]">/ {targetCarbs}g</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalC / targetCarbs) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="bg-[#1c140c] p-3 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8b9c8a] mb-1">
                <span>Fats</span>
                <Utensils size={13} className="text-rose-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">
                {totalF}g <span className="text-xs font-mono text-[#8b9c8a]">/ {targetFat}g</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-rose-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalF / targetFat) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. MEAL SLOTS BAR */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5">
            {customSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap border ${
                  selectedSlot === slot
                    ? "bg-[#38bdf8] text-[#0a192f] font-bold border-[#38bdf8]"
                    : "bg-white/[0.03] border-white/10 text-[#8b9c8a] hover:text-white"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSlotModalOpen(true)}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[#8b9c8a] hover:text-white rounded-xl text-xs font-mono flex items-center gap-1 border border-white/10 flex-shrink-0"
          >
            <Plus size={12} />
            <span>Slot</span>
          </button>
        </div>

        {/* 3. TABS: QUICK SEARCH vs MEAL BUILDER */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("quick_search")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
                activeTab === "quick_search"
                  ? "bg-[#38bdf8]/15 border-[#38bdf8] text-[#38bdf8]"
                  : "bg-white/[0.02] border-white/10 text-[#8b9c8a] hover:text-white"
              }`}
            >
              <BookOpen size={13} />
              <span>Indian Staples</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom_builder")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
                activeTab === "custom_builder"
                  ? "bg-[#38bdf8]/15 border-[#38bdf8] text-[#38bdf8]"
                  : "bg-white/[0.02] border-white/10 text-[#8b9c8a] hover:text-white"
              }`}
            >
              <ChefHat size={13} />
              <span>Pantry Builder</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCustomItemModalOpen(true)}
            className="px-2.5 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8] text-[#38bdf8] hover:text-[#0a192f] border border-[#38bdf8]/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1"
          >
            <Plus size={12} />
            <span>Custom Item</span>
          </button>
        </div>

        {/* 4. MAIN CONTENT */}
        {activeTab === "quick_search" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Food List (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b9c8a]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Indian foods (Roti, Dal, Paneer, Chicken, Sattu, Biryani)..."
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-2xl pl-9 pr-4 py-2 text-xs placeholder:text-[var(--muted-foreground)] outline-none"
                />
              </div>

              {/* Minimal Category Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "All" },
                  { id: "high_protein", label: "High Protein" },
                  { id: "veg", label: "Veg" },
                  { id: "nonveg", label: "Non-Veg" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all border ${
                      categoryFilter === c.id
                        ? "bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] font-bold"
                        : "bg-white/[0.02] border-white/10 text-[#8b9c8a] hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Foods List */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredFoods.slice(0, 30).map((item) => {
                  const isSelected = picked.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setPicked(item)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-[#38bdf8]/15 border-[#38bdf8]"
                          : "bg-[#0b110d] border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <div>
                          <b className="text-xs text-white block">{item.name}</b>
                          <span className="text-[10px] text-[#8b9c8a] font-mono">{item.servingSize}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div>
                          <b className="text-xs text-white block">{item.kcal} kcal</b>
                          <span className="text-[10px] font-mono text-[#38bdf8]">{item.p}g P</span>
                        </div>
                        <ChevronRight size={13} className="text-[#8b9c8a]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Portion & 1-Click Log (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[var(--card)] border border-[#38bdf8]/30 rounded-3xl p-4 space-y-3.5">
                <div>
                  <span className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-wider block">
                    Selected Item
                  </span>
                  <h3 className="text-sm font-extrabold text-[var(--card-foreground)] mt-0.5">{picked.name}</h3>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{picked.servingSize}</span>
                </div>

                {/* Portion Multipliers */}
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPortionMultiplier(m)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                        portionMultiplier === m
                          ? "bg-[#38bdf8] text-[#0a192f] border-[#38bdf8]"
                          : "bg-white/5 text-[#8b9c8a] border-white/10 hover:text-white"
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>

                {/* Macro Summary Strip */}
                <div className="grid grid-cols-4 gap-1 bg-[var(--card)]/60 p-2.5 rounded-2xl border border-[var(--border)] text-center text-[11px] font-mono">
                  <div><span className="text-[var(--muted-foreground)] block text-[9px]">KCAL</span><b className="text-[var(--card-foreground)]">{currentKcal}</b></div>
                  <div><span className="text-[#38bdf8] block text-[9px]">PROT</span><b className="text-[#38bdf8]">{currentP}g</b></div>
                  <div><span className="text-sky-400 block text-[9px]">CARB</span><b className="text-[var(--card-foreground)]">{currentC}g</b></div>
                  <div><span className="text-rose-400 block text-[9px]">FAT</span><b className="text-[var(--card-foreground)]">{currentF}g</b></div>
                </div>

                {/* 1-Click Log Button */}
                <button
                  type="button"
                  onClick={handleLogSingle}
                  className="w-full py-3 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a192f] font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                >
                  <Plus size={15} />
                  <span>Log to {selectedSlot} ({currentKcal} kcal)</span>
                </button>
              </div>

              {/* Minimal Timeline */}
              <CleanTimelineCard loggedEntries={loggedEntries} onDelete={handleDeleteEntry} />
            </div>
          </div>
        ) : (
          /* PANTRY MEAL BUILDER VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Ingredients Picker (6 Cols) */}
            <div className="lg:col-span-6 space-y-3 bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4">
              <span className="text-xs font-mono font-bold text-[var(--card-foreground)] uppercase tracking-wider block">
                Select Raw Ingredients
              </span>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9c8a]" />
                <input
                  type="text"
                  value={pantryQuery}
                  onChange={(e) => setPantryQuery(e.target.value)}
                  placeholder="Filter ingredients (Oats, Eggs, Chicken, Milk, Rice)..."
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none"
                />
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredPantry.map((ing) => (
                  <div
                    key={ing.id}
                    onClick={() => {
                      const def = ing.defaultUnit === "g" ? 100 : ing.defaultUnit === "ml" ? 200 : 1;
                      setActiveIngredients((prev) => [
                        ...prev,
                        { id: `ing-${Date.now()}-${Math.random()}`, ingredient: ing, amount: def, unit: ing.defaultUnit },
                      ]);
                      toast.info(`Added ${ing.name}`);
                    }}
                    className="p-2 rounded-xl bg-[var(--card)]/70 border border-[var(--border)] hover:border-[#38bdf8]/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <b className="text-[var(--card-foreground)] block">{ing.name}</b>
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        Per 100g: {ing.kcalPer100g} kcal • {ing.pPer100g}g P
                      </span>
                    </div>
                    <Plus size={14} className="text-[#38bdf8]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Recipe Assembler (6 Cols) */}
            <div className="lg:col-span-6 space-y-3 bg-[var(--card)] border border-[#38bdf8]/30 rounded-3xl p-4">
              <input
                type="text"
                value={builderMealName}
                onChange={(e) => setBuilderMealName(e.target.value)}
                placeholder="Meal Name (e.g. Power Oats Bowl)"
                className="w-full bg-transparent border-b border-[var(--border)] focus:border-[#38bdf8] pb-1 text-sm font-bold text-[var(--card-foreground)] outline-none"
              />

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {activeIngredients.map((item, idx) => {
                  const m = calculateIngredientMacros(item.ingredient, item.amount, item.unit);
                  return (
                    <div key={item.id} className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <b className="text-white block">{item.ingredient.name}</b>
                        <span className="text-[10px] font-mono text-[#38bdf8]">{m.kcal} kcal • {m.p}g P</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setActiveIngredients((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, amount: val } : it))
                            );
                          }}
                          className="w-12 text-center bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded px-1 text-xs font-mono"
                        />
                        <span className="text-[10px] font-mono text-[#8b9c8a]">{item.unit}</span>
                        <button
                          type="button"
                          aria-label="Remove ingredient"
                          onClick={() => setActiveIngredients((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#5a6b58] hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Macros */}
              <div className="grid grid-cols-4 gap-1 bg-[var(--card)]/60 p-2 rounded-xl border border-[var(--border)] text-center text-[10px] font-mono">
                <div><span className="text-[var(--muted-foreground)] block">KCAL</span><b className="text-[var(--card-foreground)]">{builderTotals.kcal}</b></div>
                <div><span className="text-[#38bdf8] block">PROT</span><b className="text-[#38bdf8]">{builderTotals.p}g</b></div>
                <div><span className="text-sky-400 block">CARB</span><b className="text-[var(--card-foreground)]">{builderTotals.c}g</b></div>
                <div><span className="text-rose-400 block">FAT</span><b className="text-[var(--card-foreground)]">{builderTotals.f}g</b></div>
              </div>

              <button
                type="button"
                onClick={handleLogBuiltMeal}
                className="w-full py-2.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a192f] font-mono font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Log to {selectedSlot}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL 1: TARGETS & DIET PRESETS --- */}
      <Dialog open={targetModalOpen} onOpenChange={setTargetModalOpen}>
        <DialogContent className="max-w-md bg-[var(--card)] border border-[#38bdf8]/30 text-[var(--card-foreground)] rounded-3xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--card-foreground)] flex items-center gap-2">
              <Sliders size={16} className="text-[#38bdf8]" />
              <span>Macro Targets & Strategy</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Choose a strategy preset or adjust grams directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-2">
            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "cutting" as const, label: "Cut" },
                { id: "bulking" as const, label: "Bulk" },
                { id: "maintenance" as const, label: "Maintain" },
                { id: "keto" as const, label: "Keto" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleApplyDietPreset(s.id)}
                  className="p-2 rounded-xl bg-[var(--card)]/70 hover:bg-[#38bdf8]/15 border border-[var(--border)] text-[var(--card-foreground)] text-xs font-mono font-bold text-center"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  value={draftTarget.goalKcal}
                  onChange={(e) => setDraftTarget({ ...draftTarget, goalKcal: Number(e.target.value) })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#38bdf8] block mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={draftTarget.goalProtein}
                  onChange={(e) => setDraftTarget({ ...draftTarget, goalProtein: Number(e.target.value) })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-sky-400 block mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={draftTarget.goalCarbs}
                  onChange={(e) => setDraftTarget({ ...draftTarget, goalCarbs: Number(e.target.value) })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-rose-400 block mb-1">Fats (g)</label>
                <input
                  type="number"
                  value={draftTarget.goalFat}
                  onChange={(e) => setDraftTarget({ ...draftTarget, goalFat: Number(e.target.value) })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveTargets}
              className="w-full py-2.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a192f] font-mono font-bold text-xs uppercase rounded-xl transition-all"
            >
              Save Targets
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: CUSTOM SINGLE FOOD ITEM --- */}
      <Dialog open={customItemModalOpen} onOpenChange={setCustomItemModalOpen}>
        <DialogContent className="max-w-sm bg-[var(--card)] border border-[#38bdf8]/30 text-[var(--card-foreground)] rounded-3xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--card-foreground)] flex items-center gap-2">
              <Plus size={16} className="text-[#38bdf8]" />
              <span>Add Custom Food</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5 mt-2">
            <div>
              <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">Item Name</label>
              <input
                type="text"
                value={draftCustom.name}
                onChange={(e) => setDraftCustom({ ...draftCustom, name: e.target.value })}
                placeholder="e.g. Sattu Drink"
                className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className="text-[9px] font-mono text-[var(--muted-foreground)] block mb-0.5">Kcal</label>
                <input
                  type="number"
                  value={draftCustom.kcal}
                  onChange={(e) => setDraftCustom({ ...draftCustom, kcal: e.target.value })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#38bdf8] block mb-0.5">Prot</label>
                <input
                  type="number"
                  value={draftCustom.p}
                  onChange={(e) => setDraftCustom({ ...draftCustom, p: e.target.value })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-sky-400 block mb-0.5">Carb</label>
                <input
                  type="number"
                  value={draftCustom.c}
                  onChange={(e) => setDraftCustom({ ...draftCustom, c: e.target.value })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-rose-400 block mb-0.5">Fat</label>
                <input
                  type="number"
                  value={draftCustom.f}
                  onChange={(e) => setDraftCustom({ ...draftCustom, f: e.target.value })}
                  className="w-full bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCustomItem}
              className="w-full py-2.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a192f] font-mono font-bold text-xs uppercase rounded-xl mt-1 transition-all"
            >
              Add Item
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: ADD MEAL SLOT --- */}
      <Dialog open={slotModalOpen} onOpenChange={setSlotModalOpen}>
        <DialogContent className="max-w-sm bg-[var(--card)] border border-[#38bdf8]/30 text-[var(--card-foreground)] rounded-3xl p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--card-foreground)] flex items-center gap-2">
              <Layers size={16} className="text-[#38bdf8]" />
              <span>Add Meal Category</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                placeholder="e.g. Midnight Snack"
                className="flex-1 bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] focus:border-[#38bdf8] rounded-xl px-2.5 py-1.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-3 py-1.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a192f] font-mono font-bold text-xs rounded-xl transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </WorkflowLayout>
  );
}

// Minimalist Timeline Card
function CleanTimelineCard({
  loggedEntries,
  onDelete,
}: {
  loggedEntries: LoggedEntry[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <span className="text-xs font-mono font-bold text-[var(--card-foreground)] uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={13} className="text-[#38bdf8]" />
          <span>Today's Log ({loggedEntries.length})</span>
        </span>
      </div>

      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
        {loggedEntries.length === 0 ? (
          <div className="text-center py-4 text-[11px] font-mono text-[var(--muted-foreground)]">
            No meals logged yet today.
          </div>
        ) : (
          loggedEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-2 rounded-xl bg-[var(--card)]/60 border border-[var(--border)] flex items-center justify-between text-xs"
            >
              <div>
                <b className="text-[var(--card-foreground)] block">{entry.name}</b>
                <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                  {entry.meal} • {entry.time}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right font-mono text-[11px]">
                  <b className="text-[var(--card-foreground)] block">{entry.kcal} kcal</b>
                  <span className="text-[#38bdf8] text-[10px]">{entry.p}g P</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${entry.name} from today's log`}
                  onClick={() => onDelete(entry.id)}
                  className="p-1 text-[#5a6b58] hover:text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
