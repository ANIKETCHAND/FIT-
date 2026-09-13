import { useMemo, useState } from "react";
import "./GithubContributionGraph.css";
import { getScopedKey } from "@/lib/user-store";
import { trpc } from "@/lib/trpc";

interface DayCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

interface MonthMarker {
  name: string;
  colIndex: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format Date object to YYYY-MM-DD in user's local timezone */
export function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convert any timestamp, ISO string, Date object, or date string into strict local YYYY-MM-DD */
export function parseDateToLocalKey(val: any): string | null {
  if (val === null || val === undefined) return null;
  try {
    if (val instanceof Date && !isNaN(val.getTime())) {
      return formatLocalDateKey(val);
    }
    if (typeof val === "number") {
      if (isNaN(val) || val <= 0) return null;
      const ms = val < 1e11 ? val * 1000 : val;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return formatLocalDateKey(d);
      }
      return null;
    }
    if (typeof val === "string") {
      const clean = val.trim();
      if (!clean) return null;

      // Exact YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        return clean;
      }

      // Parse timestamp string or ISO format into local Date
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return formatLocalDateKey(d);
      }

      // Fallback regex match for leading YYYY-MM-DD
      const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
  } catch {}
  return null;
}

/** Format YYYY-MM-DD into readable human date (e.g. "Sep 1, 2026") */
function formatHumanDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  } catch {}
  return dateStr;
}

/** Helper to read arrays or objects flexibly from localStorage */
function safeReadEntries(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.items)) return parsed.items;
      if (Array.isArray(parsed.logs)) return parsed.logs;
      if (Array.isArray(parsed.routes)) return parsed.routes;
      if (Array.isArray(parsed.sessions)) return parsed.sessions;
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
}

/** Deduplicate and extract all real user activities onto local date keys */
function extractActivityDates(
  dbWorkouts?: any[],
  dbGps?: any[],
  dbNutrition?: any[],
  dbMetrics?: any[]
): Map<string, number> {
  const map = new Map<string, number>();
  const seenIds = new Set<string>();

  const register = (id: string, dateRaw: any) => {
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    const dateKey = parseDateToLocalKey(dateRaw);
    if (dateKey) {
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    }
  };

  // 1. Workouts (scoped & unscoped keys + database)
  const workouts = [
    ...safeReadEntries(getScopedKey("fittrack_workout_logs")),
    ...safeReadEntries("fittrack_workout_logs"),
    ...safeReadEntries(getScopedKey("fittrack_workout_history")),
    ...safeReadEntries("fittrack_workout_history"),
    ...(dbWorkouts || []),
  ];
  workouts.forEach((w, idx) => {
    const dateVal = w.completedAt || w.startedAt || w.createdAt || w.date;
    if (!dateVal) return;
    const id = w.id ? `workout_${w.id}` : `workout_${w.title || w.focus || "log"}_${dateVal}_${w.volumeKg || idx}`;
    register(id, dateVal);
  });

  // 2. GPS Sessions & Saved Routes
  const gpsSessions = [
    ...safeReadEntries(getScopedKey("fittrack_gps_sessions")),
    ...safeReadEntries("fittrack_gps_sessions"),
    ...safeReadEntries(getScopedKey("fittrack_gps_routes")),
    ...safeReadEntries("fittrack_gps_routes"),
    ...(dbGps || []),
  ];
  gpsSessions.forEach((g, idx) => {
    const dateVal = g.startedAt || g.endedAt || g.completedAt || g.createdAt || g.savedAt || g.date;
    if (!dateVal) return;
    const id = g.id ? `gps_${g.id}` : `gps_${g.label || g.name || "run"}_${dateVal}_${g.distanceMeters || idx}`;
    register(id, dateVal);
  });

  // 3. Live Timed Sessions
  const liveSessions = [
    ...safeReadEntries(getScopedKey("fittrack_sessions")),
    ...safeReadEntries("fittrack_sessions"),
  ];
  liveSessions.forEach((s, idx) => {
    const dateVal = s.startedAt || s.completedAt || s.createdAt || s.date;
    if (!dateVal) return;
    const id = s.id ? `session_${s.id}` : `session_${s.mode || "live"}_${dateVal}_${s.durationSeconds || idx}`;
    register(id, dateVal);
  });

  // 4. Daily Nutrition Logs & Meals
  const nutritionLogs = [
    ...safeReadEntries(getScopedKey("fittrack_logged_nutrition_today")),
    ...safeReadEntries("fittrack_logged_nutrition_today"),
    ...safeReadEntries(getScopedKey("fittrack_nutrition_logs")),
    ...safeReadEntries("fittrack_nutrition_logs"),
    ...(dbNutrition || []),
  ];
  nutritionLogs.forEach((m, idx) => {
    const dateVal = m.consumedAt || m.createdAt || m.date;
    if (!dateVal) return;
    const id = m.id ? `meal_${m.id}` : `meal_${m.name || m.label || "food"}_${dateVal}_${m.kcal || m.calories || idx}`;
    register(id, dateVal);
  });

  // 5. Weight & Biometric Checkpoints
  const metricLogs = [
    ...safeReadEntries(getScopedKey("fittrack_metrics")),
    ...safeReadEntries("fittrack_metrics"),
    ...safeReadEntries(getScopedKey("fittrack_weight_logs")),
    ...safeReadEntries("fittrack_weight_logs"),
    ...(dbMetrics || []),
  ];
  metricLogs.forEach((mt, idx) => {
    const dateVal = mt.capturedAt || mt.createdAt || mt.date;
    if (!dateVal) return;
    const id = mt.id ? `metric_${mt.id}` : `metric_${dateVal}_${mt.weightKg || idx}`;
    register(id, dateVal);
  });

  // 6. Exercise Library Progress Checkpoints
  const exProgress = safeReadEntries(getScopedKey("fittrack-exercise-progress"));
  exProgress.forEach((entry) => {
    if (typeof entry === "object" && entry) {
      Object.entries(entry).forEach(([exId, target]: [string, any]) => {
        if (target?.completed && target?.completedAt) {
          register(`ex_${exId}_${target.completedAt}`, target.completedAt);
        }
      });
    }
  });

  // 7. Streak continuity check
  try {
    const streakRaw = localStorage.getItem(getScopedKey("fittrack-daily-streak")) || localStorage.getItem("fittrack-daily-streak");
    if (streakRaw) {
      const parsed = JSON.parse(streakRaw);
      if (parsed?.lastCompletedDate && !map.has(parsed.lastCompletedDate)) {
        map.set(parsed.lastCompletedDate, 1);
      }
    }
  } catch {}

  return map;
}

export function GithubContributionGraph() {
  const currentYear = new Date().getFullYear();

  const { data: dbWorkouts } = trpc.workouts.list.useQuery(undefined, { retry: false });
  const { data: dbGps } = trpc.gps.list.useQuery(undefined, { retry: false });
  const { data: dbNutrition } = trpc.nutrition.list.useQuery(undefined, { retry: false });
  const { data: dbMetrics } = trpc.metrics.list.useQuery(undefined, { retry: false });

  const activityMap = useMemo(() => {
    return extractActivityDates(dbWorkouts, dbGps, dbNutrition, dbMetrics);
  }, [dbWorkouts, dbGps, dbNutrition, dbMetrics]);

  // Dynamic available years based on user's logged activity
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    activityMap.forEach((_, dateStr) => {
      const y = parseInt(dateStr.split("-")[0]);
      if (!isNaN(y) && y >= 2020 && y <= currentYear + 1) {
        years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [activityMap, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || currentYear);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // Compute 53 weeks dynamically for the selected year with month markers
  const { weeks, monthMarkers, totalCount } = useMemo(() => {
    const totalWeeks = 53;
    const grid: DayCell[][] = [];
    const markers: MonthMarker[] = [];
    let sum = 0;
    let lastMonth = -1;

    const now = new Date();
    const todayKey = formatLocalDateKey(now);
    const isCurrentYear = selectedYear === now.getFullYear();

    let startSunday: Date;
    if (isCurrentYear) {
      // 53 columns rolling ending on the current week (column 52 contains today at row = now.getDay())
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      startSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 52 * 7, 12, 0, 0);
    } else {
      // Calendar year mode: Starts on the Sunday on or before Jan 1 of selectedYear
      const jan1 = new Date(selectedYear, 0, 1, 12, 0, 0);
      startSunday = new Date(selectedYear, 0, 1 - jan1.getDay(), 12, 0, 0);
    }

    for (let w = 0; w < totalWeeks; w++) {
      const week: DayCell[] = [];
      const midWeekDate = new Date(startSunday.getFullYear(), startSunday.getMonth(), startSunday.getDate() + (w * 7 + 3), 12, 0, 0);
      const colMonth = midWeekDate.getMonth();

      // Check if this week marks a new month (spaced at least 2 columns apart)
      if (colMonth !== lastMonth) {
        const prevMarker = markers[markers.length - 1];
        if (!prevMarker || w - prevMarker.colIndex >= 2) {
          markers.push({
            name: MONTH_NAMES[colMonth],
            colIndex: w,
          });
          lastMonth = colMonth;
        }
      }

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startSunday.getFullYear(), startSunday.getMonth(), startSunday.getDate() + (w * 7 + d), 12, 0, 0);
        const dateKey = formatLocalDateKey(cellDate);
        const isFuture = isCurrentYear && dateKey > todayKey;
        const count = isFuture ? 0 : (activityMap.get(dateKey) || 0);
        sum += count;

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count >= 4) level = 4;
        else if (count === 3) level = 3;
        else if (count === 2) level = 2;
        else if (count >= 1) level = 1;

        week.push({ date: dateKey, count, level, isFuture });
      }
      grid.push(week);
    }
    return { weeks: grid, monthMarkers: markers, totalCount: sum };
  }, [activityMap, selectedYear]);

  const yearHeaderText = selectedYear === currentYear
    ? `${totalCount} contribution${totalCount === 1 ? "" : "s"} in the last year`
    : `${totalCount} contribution${totalCount === 1 ? "" : "s"} in ${selectedYear}`;

  const CELL_SIZE = 10;
  const CELL_GAP = 3;
  const LEFT_OFFSET = 30;
  const TOP_OFFSET = 20;
  const STRIDE = CELL_SIZE + CELL_GAP; // 13px

  const svgWidth = LEFT_OFFSET + weeks.length * STRIDE + 8;
  const svgHeight = TOP_OFFSET + 7 * STRIDE + 6;

  return (
    <div className="gh-contribution-section">
      <div className="gh-contribution-main">
        {/* Top Header */}
        <div className="gh-contribution-topbar">
          <span className="gh-contribution-title">
            {yearHeaderText}
          </span>
        </div>

        {/* Boxed Heatmap Canvas with Pixel-Perfect Alignment */}
        <div className="gh-contribution-box">
          <div className="gh-svg-scroll-container">
            <svg
              className="gh-heatmap-svg"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width={svgWidth}
              height={svgHeight}
              role="img"
              aria-label="Training contribution heatmap"
            >
              {/* Month Header Labels Aligned to Exact Week Columns */}
              {monthMarkers.map((marker, i) => (
                <text
                  key={`${marker.name}-${i}`}
                  x={LEFT_OFFSET + marker.colIndex * STRIDE}
                  y={12}
                  className="gh-svg-month-label"
                >
                  {marker.name}
                </text>
              ))}

              {/* Day of Week Labels */}
              <text x={0} y={TOP_OFFSET + 1 * STRIDE + 8} className="gh-svg-day-label">Mon</text>
              <text x={0} y={TOP_OFFSET + 3 * STRIDE + 8} className="gh-svg-day-label">Wed</text>
              <text x={0} y={TOP_OFFSET + 5 * STRIDE + 8} className="gh-svg-day-label">Fri</text>

              {/* Heatmap 53x7 Grid Cells */}
              {weeks.map((week, wIdx) => {
                const colX = LEFT_OFFSET + wIdx * STRIDE;
                return (
                  <g key={`w-${wIdx}`}>
                    {week.map((cell, dIdx) => {
                      const cellY = TOP_OFFSET + dIdx * STRIDE;
                      return (
                        <rect
                          key={`c-${wIdx}-${dIdx}`}
                          x={colX}
                          y={cellY}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={1.5}
                          ry={1.5}
                          className={`gh-svg-cell level-${cell.level} ${cell.isFuture ? "cell-future" : ""}`}
                          onMouseEnter={(e) => {
                            if (cell.isFuture) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              date: cell.date,
                              count: cell.count,
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Footer with link & legend */}
          <div className="gh-contribution-footer">
            <a
              href="#learn-contributions"
              className="gh-learn-link"
              onClick={(e) => e.preventDefault()}
            >
              Learn how we count contributions
            </a>

            <div className="gh-legend">
              <span className="gh-legend-label">Less</span>
              <div className="gh-legend-cell level-0" />
              <div className="gh-legend-cell level-1" />
              <div className="gh-legend-cell level-2" />
              <div className="gh-legend-cell level-3" />
              <div className="gh-legend-cell level-4" />
              <span className="gh-legend-label">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Year Navigation Tabs - Only for years with activity */}
      <div className="gh-years-nav">
        {availableYears.map((year) => (
          <button
            key={year}
            type="button"
            className={`gh-year-btn ${selectedYear === year ? "active" : ""}`}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Floating Tooltip with Human Formatted Date */}
      {hoveredCell && (
        <div
          className="gh-tooltip"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
          }}
        >
          {hoveredCell.count === 0
            ? `No contributions on ${formatHumanDate(hoveredCell.date)}`
            : `${hoveredCell.count} contribution${hoveredCell.count > 1 ? "s" : ""} on ${formatHumanDate(hoveredCell.date)}`}
        </div>
      )}
    </div>
  );
}
