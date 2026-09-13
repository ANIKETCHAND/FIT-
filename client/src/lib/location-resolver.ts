/**
 * FitTrack Geolocation & Reverse-Geocoding Engine
 * Requests browser/device location permission and resolves city, region, and country name.
 */
import { getAthleteProfile, saveAthleteProfile } from "./user-store";

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  formattedLocation: string;
}

/**
 * Reverse geocodes latitude/longitude coordinates into a human-readable city/country string.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // Strategy 1: BigDataCloud Client Reverse Geocode (free, fast, highly reliable)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "";
      const region = data.principalSubdivision && data.principalSubdivision !== city ? data.principalSubdivision : "";
      const country = data.countryName || "";

      const parts = [city, region, country].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {}

  // Strategy 2: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
        signal: AbortSignal.timeout(4500),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "";
      const state = addr.state || "";
      const country = addr.country || "";

      const parts = [city, state, country].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {}

  // Fallback: Coordinate format
  return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
}

/**
 * Fallback to IP-based location if GPS permission is denied or pending.
 */
export async function fetchIpLocation(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const parts = [data.city, data.region, data.country_name].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {}

  try {
    // Timezone city fallback
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes("/")) {
      const city = tz.split("/")[1].replace(/_/g, " ");
      return city;
    }
  } catch {}

  return null;
}

/**
 * Requests device GPS location and returns formatted location string.
 */
export function requestDeviceLocation(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const formatted = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          resolve(formatted);
        } catch {
          resolve(`${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`);
        }
      },
      async (err) => {
        // If GPS is denied or timed out, attempt IP fallback
        const ipLoc = await fetchIpLocation();
        if (ipLoc) {
          resolve(ipLoc);
        } else {
          reject(err);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000, // 5 min cache
      }
    );
  });
}

/**
 * Automatically checks and syncs the athlete's current real-world location.
 */
export async function autoSyncAthleteLocation(force = false): Promise<string | null> {
  try {
    const profile = getAthleteProfile();
    const isDefault = !profile.location || profile.location === "New York, USA" || profile.location.includes("New York") || profile.location === "Detecting location...";

    if (!force && !isDefault) {
      return profile.location;
    }

    const detected = await requestDeviceLocation();
    if (detected && detected !== profile.location) {
      const nextProfile = { ...profile, location: detected };
      saveAthleteProfile(nextProfile);
      window.dispatchEvent(new CustomEvent("fittrack_location_updated", { detail: detected }));
      return detected;
    }
    return detected;
  } catch (err) {
    console.warn("Could not auto-sync device location:", err);
    return null;
  }
}

