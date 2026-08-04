/** Geolocation helpers for the classroom geofence. */

export type Coords = { lat: number; lng: number; accuracy?: number }

/** Great-circle distance in metres between two coordinates. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export class GeoError extends Error {}

/** Reads a single high-accuracy fix, with friendly error messages. */
export function readCurrentPosition(timeoutMs = 12000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeoError("Location is not available on this device."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoError("Location permission denied. Allow location access to check in."))
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoError("Couldn't get a location fix. Move near a window and try again."))
        } else {
          reject(new GeoError("Location unavailable right now. Please try again."))
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}
