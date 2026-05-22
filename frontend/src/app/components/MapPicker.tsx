import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2, Search, X } from 'lucide-react';
import type L from 'leaflet';

interface MapPickerProps {
  value?: { lat: number; lng: number; address: string };
  onChange: (val: { lat: number; lng: number; address: string }) => void;
  readonly?: boolean;
  markers?: Array<{ lat: number; lng: number; label?: string; color?: string }>;
  height?: string;
}

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

const LEAFLET_ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const LEAFLET_ICON_RETINA_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const LEAFLET_SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

function createDefaultIcon(LeafletLib: typeof L) {
  return LeafletLib.icon({
    iconUrl: LEAFLET_ICON_URL,
    iconRetinaUrl: LEAFLET_ICON_RETINA_URL,
    shadowUrl: LEAFLET_SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      { headers: { 'User-Agent': 'SnapOn-App/1.0' } }
    );
    const data = await res.json();
    if (data.display_name) {
      return data.display_name.split(', ').slice(0, 4).join(', ');
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function MapPicker({ value, onChange, readonly = false, markers = [], height = '300px' }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  // null = unchecked, true = available, false = blocked/unavailable
  const [geoAvailable, setGeoAvailable] = useState<boolean | null>(null);
  const [address, setAddress] = useState(value?.address || '');

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Check geolocation availability on mount ──────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoAvailable(false);
      return;
    }
    // Use Permissions API to check without triggering a prompt
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          // 'denied' means blocked (permissions policy or user denied)
          setGeoAvailable(result.state !== 'denied');
          result.onchange = () => {
            setGeoAvailable(result.state !== 'denied');
          };
        })
        .catch(() => {
          // Permissions API not available — assume available, let it fail gracefully
          setGeoAvailable(true);
        });
    } else {
      setGeoAvailable(true);
    }
  }, []);

  // ── Init Leaflet map ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then((Leaflet) => {
      if (!mounted || !containerRef.current) return;
      const L = Leaflet.default;
      const defaultIcon = createDefaultIcon(L);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      if (!document.head.querySelector('link[href*="leaflet"]')) {
        document.head.appendChild(link);
      }

      const center: [number, number] = value
        ? [value.lat, value.lng]
        : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

      const map = L.map(containerRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: !readonly,
        dragging: !readonly,
        doubleClickZoom: !readonly,
        touchZoom: !readonly,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      if (value) {
        const marker = L.marker([value.lat, value.lng], { icon: defaultIcon }).addTo(map);
        if (value.address) marker.bindPopup(value.address).openPopup();
        markerRef.current = marker;
      }

      markers.forEach(m => {
        const color = m.color || 'blue';
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : '#3b82f6'};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.label || '');
      });

      if (!readonly) {
        map.on('click', async (e: L.LeafletMouseEvent) => {
          if (!mounted) return;
          const { lat, lng } = e.latlng;
          setLoading(true);

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
          }

          const addr = await reverseGeocode(lat, lng);
          if (!mounted) return;
          setAddress(addr);
          markerRef.current?.bindPopup(addr).openPopup();
          onChange({ lat, lng, address: addr });
          setLoading(false);
        });
      }
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // ── Sync external value changes ───────────────────────────
  useEffect(() => {
    if (!mapRef.current || !value || readonly) return;
    import('leaflet').then(({ default: L }) => {
      const defaultIcon = createDefaultIcon(L);
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
        mapRef.current!.panTo([value.lat, value.lng]);
      } else if (mapRef.current) {
        markerRef.current = L.marker([value.lat, value.lng], { icon: defaultIcon }).addTo(mapRef.current);
      }
      setAddress(value.address);
    });
  }, [value?.lat, value?.lng]);

  // ── GPS handler ───────────────────────────────────────────
  const useCurrentLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLoading(true);
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
        onChange({ lat, lng, address: addr });

        if (mapRef.current) mapRef.current.flyTo([lat, lng], 15);
        import('leaflet').then(({ default: L }) => {
          const defaultIcon = createDefaultIcon(L);
          if (!mapRef.current) return;
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
          }
          markerRef.current.bindPopup(addr).openPopup();
        });
        setLoading(false);
        setGeoLoading(false);
      },
      () => {
        // GPS silently failed — mark as unavailable so the button disappears
        setGeoAvailable(false);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Address search ────────────────────────────────────────
  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&accept-language=vi&limit=5&countrycodes=vn`,
          { headers: { 'User-Agent': 'SnapOn-App/1.0' } }
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
        setShowDropdown(data.length > 0);
      } catch { /* silent */ }
      setSearchLoading(false);
    }, 450);
  };

  const handleSelectResult = async (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const addr = r.display_name.split(', ').slice(0, 4).join(', ');

    setSearchQuery(addr);
    setShowDropdown(false);
    setSearchResults([]);
    setAddress(addr);
    onChange({ lat, lng, address: addr });

    if (mapRef.current) mapRef.current.flyTo([lat, lng], 15);
    import('leaflet').then(({ default: L }) => {
      const defaultIcon = createDefaultIcon(L);
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
      }
      markerRef.current.bindPopup(addr).openPopup();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {!readonly && (
        <div className="flex flex-col gap-2">
          {/* Address search box */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-300 focus-within:border-transparent shadow-sm">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Tìm địa chỉ... (vd: 123 Nguyễn Huệ, Quận 1)"
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
              />
              {searchLoading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />}
              {searchQuery && !searchLoading && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                  className="flex-shrink-0 hover:text-gray-600 text-gray-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
                {searchResults.map(r => (
                  <button
                    key={r.place_id}
                    type="button"
                    onMouseDown={() => handleSelectResult(r)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-orange-50 transition text-left border-b border-gray-50 last:border-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 leading-snug">
                      {r.display_name.split(', ').slice(0, 5).join(', ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS button — only render when geolocation is confirmed available */}
          <div className="flex items-center gap-2">
            {geoAvailable === true && (
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-sm transition disabled:opacity-50"
                style={{ fontWeight: 500 }}
              >
                {geoLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Navigation className="w-3.5 h-3.5" />}
                {geoLoading ? 'Đang lấy...' : 'Dùng GPS'}
              </button>
            )}
            <span className="text-xs text-gray-400">
              {geoAvailable === false
                ? '👆 Tìm kiếm địa chỉ hoặc nhấn thẳng vào bản đồ để ghim vị trí'
                : 'hoặc nhấn vào bản đồ để chọn'}
            </span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-gray-200 relative cursor-crosshair"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-[9999] pointer-events-none">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-sm text-gray-600">Đang tìm địa chỉ...</span>
            </div>
          </div>
        )}
        {!readonly && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
            <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm" style={{ fontWeight: 500 }}>
              👆 Nhấn vào bản đồ để chọn vị trí
            </div>
          </div>
        )}
      </div>

      {/* Selected address display */}
      {address && (
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <span>{address}</span>
        </div>
      )}
      {!address && !readonly && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Chưa chọn địa điểm — hãy tìm kiếm hoặc nhấn vào bản đồ
        </p>
      )}
    </div>
  );
}