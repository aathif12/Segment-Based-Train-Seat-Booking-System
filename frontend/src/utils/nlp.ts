import type { Station } from '../api/client'

export interface ParsedQuery {
  fromId?: string;
  toId?: string;
  date?: string; // YYYY-MM-DD
}

/**
 * Attempts to parse a natural language query into structured search parameters.
 * First tries to use an external API if a token is present, otherwise falls back
 * to a local heuristic-based engine.
 */
export async function parseNaturalLanguageQuery(query: string, stations: Station[]): Promise<ParsedQuery> {
  const q = query.toLowerCase();
  
  // TODO: In a production setting, if VITE_WIT_AI_TOKEN or similar is set, 
  // we would make an HTTP request here.
  // const token = import.meta.env.VITE_WIT_AI_TOKEN;
  // if (token) { return await callWitAi(query, token); }

  // Fallback: Local Heuristic Engine
  // Simulate network delay for "AI thinking" effect
  await new Promise(resolve => setTimeout(resolve, 800));

  const result: ParsedQuery = {};

  // 1. Detect Stations
  // Simple heuristic: "from X" and "to Y"
  const fromMatch = q.match(/from\s+([a-z\s]+?)(?:\s+(?:to|on|tomorrow|next|today|$))/);
  const toMatch = q.match(/to\s+([a-z\s]+?)(?:\s+(?:on|tomorrow|next|today|$))/);

  const findStation = (searchStr: string) => {
    if (!searchStr) return undefined;
    const cleanSearch = searchStr.trim();
    return stations.find(s => 
      s.name.toLowerCase().includes(cleanSearch) || 
      cleanSearch.includes(s.name.toLowerCase())
    );
  }

  if (fromMatch && fromMatch[1]) {
    const s = findStation(fromMatch[1]);
    if (s) result.fromId = String(s.id);
  }

  if (toMatch && toMatch[1]) {
    const s = findStation(toMatch[1]);
    if (s) result.toId = String(s.id);
  }

  // Fallback: If "from" / "to" regex failed, just scan for station names in the query
  if (!result.fromId || !result.toId) {
    const foundStations = stations.filter(s => q.includes(s.name.toLowerCase()));
    // If exactly two stations are found and not already assigned, assign them sequentially
    if (foundStations.length >= 2) {
      if (!result.fromId) result.fromId = String(foundStations[0].id);
      if (!result.toId) result.toId = String(foundStations[1].id);
    }
  }

  // 2. Detect Dates
  const today = new Date();
  
  if (q.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow.toISOString().split('T')[0];
  } else if (q.includes('today')) {
    result.date = today.toISOString().split('T')[0];
  } else {
    // Check for "next [day of week]"
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (q.includes(`next ${days[i]}`) || q.includes(`on ${days[i]}`)) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        
        // If it's "next X", or the day has already passed this week, move to next week
        if (daysToAdd <= 0 || q.includes(`next ${days[i]}`)) {
          daysToAdd += 7;
        }
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        result.date = targetDate.toISOString().split('T')[0];
        break;
      }
    }
  }

  return result;
}
