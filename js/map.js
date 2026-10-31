/* ==========================================
   PUBLIC BOOTH — MAP V13
   WORLD / CITIES / STREETS / BUILDINGS
   ========================================== */

(() => {
  'use strict';

  const C = {
    yellow: '#FFB700',
    land: '#FFF9EB',
    black: '#141212',
    border: '#D5CCBC',
    road: '#BEB4A6',
    building: '#EFE8DB',
  };

  const MOBILE = window.innerWidth <= 700;

  const WORLD_URL =
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

  const VECTOR_URL = 'https://tiles.openfreemap.org/planet/latest';

  const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

  /* ==========================================
     DATA
     ========================================== */

  const cities = (window.PUBLIC_BOOTH_CITIES || [])
    .map(([name, lat, lng, count], id) => ({
      id,
      name,
      lat: Number(lat),
      lng: Number(lng),
      count: Number(count),
    }))
    .filter(
      (c) =>
        Number.isFinite(c.lat) &&
        Number.isFinite(c.lng) &&
        Number.isFinite(c.count) &&
        Math.abs(c.lat) <= 90 &&
        Math.abs(c.lng) <= 180,
    );

  const booths = (window.PUBLIC_BOOTH_LOCATIONS || [])
    .filter((b) => b.status === 'active' && b.lat != null && b.lng != null)
    .map((b) => ({
      ...b,
      lat: Number(b.lat),
      lng: Number(b.lng),
    }))
    .filter(
      (b) =>
        Number.isFinite(b.lat) &&
        Number.isFinite(b.lng) &&
        Math.abs(b.lat) <= 90 &&
        Math.abs(b.lng) <= 180,
    );

  const cityById = new Map(cities.map((c) => [c.id, c]));

  const boothById = new Map(booths.map((b) => [String(b.id), b]));

  /* ==========================================
     LANGUAGE
     ========================================== */

  const translations = {
    Москва: 'Moscow',
    'Санкт-Петербург': 'Saint Petersburg',
    Воронеж: 'Voronezh',
    Ессентуки: 'Yessentuki',
    Саратов: 'Saratov',
    Пятигорск: 'Pyatigorsk',
    Челябинск: 'Chelyabinsk',
    Омск: 'Omsk',
    Кемерово: 'Kemerovo',
    Тула: 'Tula',
    Краснодар: 'Krasnodar',
    Пермь: 'Perm',
    Красноярск: 'Krasnoyarsk',
    Сургут: 'Surgut',
    'Нижний Новгород': 'Nizhny Novgorod',
    Новокузнецк: 'Novokuznetsk',
    Зеленоград: 'Zelenograd',
    Казань: 'Kazan',
    Самара: 'Samara',
    'Набережные Челны': 'Naberezhnye Chelny',
    Новосибирск: 'Novosibirsk',
    Уфа: 'Ufa',
    'Ростов-на-Дону': 'Rostov-on-Don',
    Екатеринбург: 'Yekaterinburg',
    Иркутск: 'Irkutsk',
    Сочи: 'Sochi',
    Байкальск: 'Baikalsk',
    Ереван: 'Yerevan',
    Белград: 'Belgrade',
    Дубай: 'Dubai',
    Ташкент: 'Tashkent',
    Стамбул: 'Istanbul',
  };

  const english = () => window.pbGetLanguage?.() === 'en';

  const cityName = (name) => (english() ? translations[name] || name : name);

  const empty = () => ({
    type: 'FeatureCollection',
    features: [],
  });

  /* ==========================================
     MAP INITIALIZATION
     ========================================== */

  const map = new maplibregl.Map({
    container: 'map',

    style: {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'pb-bg',
          type: 'background',
          paint: {
            'background-color': C.yellow,
          },
        },
      ],
    },

    center: MOBILE ? [38, 35] : [20, 35],
    zoom: MOBILE ? 0.8 : 1.65,

    minZoom: 0,
    maxZoom: 18,

    renderWorldCopies: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,

    attributionControl: false,
  });

  window.publicBoothMap = map;

  map.touchZoomRotate.disableRotation();

  map.addControl(
    new maplibregl.AttributionControl({
      compact: true,
    }),
    'bottom-left',
  );

  /* ==========================================
     WORLD GEOGRAPHY
     ========================================== */

  async function addWorld() {
    const response = await fetch(WORLD_URL);

    if (!response.ok) {
      throw new Error('World source unavailable');
    }

    const geojson = await response.json();

    geojson.features = geojson.features.filter((f) => {
      const p = f.properties || {};

      const name = String(p.ADMIN || p.name || p.NAME || '').toLowerCase();

      const code = String(
        p['ISO3166-1-Alpha-3'] || p.ADM0_A3 || p.ISO_A3 || '',
      ).toUpperCase();

      return (
        !['ATA', 'GRL', 'ATF'].includes(code) &&
        !['antarctica', 'greenland', 'french southern'].some((v) =>
          name.includes(v),
        )
      );
    });

    map.addSource('pb-world', {
      type: 'geojson',
      data: geojson,
    });

    map.addLayer({
      id: 'pb-land',
      type: 'fill',
      source: 'pb-world',
      paint: {
        'fill-color': C.land,
      },
    });

    map.addLayer({
      id: 'pb-country-borders',
      type: 'line',
      source: 'pb-world',
      paint: {
        'line-color': C.border,
        'line-width': 0.55,
        'line-opacity': 0.65,
      },
    });
  }

  /* ==========================================
     CITY DETAILS
     OPENFREEMAP VECTOR TILES
     ========================================== */

  function addCityDetails() {
    map.addSource('pb-city-vector', {
      type: 'vector',
      url: VECTOR_URL,

      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    });

    /* MAIN ROADS */

    map.addLayer({
      id: 'pb-main-roads',
      type: 'line',

      source: 'pb-city-vector',
      'source-layer': 'transportation',

      minzoom: 8,

      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']],
      ],

      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },

      paint: {
        'line-color': C.road,
        'line-opacity': 0.85,

        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          0.5,
          12,
          0.9,
          16,
          1.6,
        ],
      },
    });

    /* SMALL STREETS */

    map.addLayer({
      id: 'pb-small-roads',
      type: 'line',

      source: 'pb-city-vector',
      'source-layer': 'transportation',

      minzoom: 11,

      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['minor', 'service', 'track', 'path']],
      ],

      paint: {
        'line-color': '#D0C6B8',

        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          0.35,
          15,
          0.7,
          18,
          1.1,
        ],
      },
    });

    /* BUILDINGS */

    map.addLayer({
      id: 'pb-normal-buildings',
      type: 'fill',

      source: 'pb-city-vector',
      'source-layer': 'building',

      minzoom: 12,

      paint: {
        'fill-color': C.building,
        'fill-opacity': 0.75,
      },
    });

    /* BUILDING OUTLINES */

    map.addLayer({
      id: 'pb-normal-building-lines',
      type: 'line',

      source: 'pb-city-vector',
      'source-layer': 'building',

      minzoom: 12,

      paint: {
        'line-color': '#C5BBAE',

        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.35, 16, 0.8],
      },
    });
  }

  /* ==========================================
     PIN DESIGN
     ========================================== */

  function makePin(label, onClick) {
    const element = document.createElement('button');

    element.type = 'button';
    element.className = 'pb-location';

    element.setAttribute('aria-label', label);

    const icon = document.createElement('span');
    icon.className = 'pb-location-icon';

    icon.innerHTML = `
      <svg
        viewBox="0 0 80 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M40 3 C19 3 5 19 5 40
             C5 63 40 96 40 96
             C40 96 75 63 75 40
             C75 19 61 3 40 3Z"
          fill="#FFB700"
          stroke="#141212"
          stroke-width="3"
        />
        <circle
          cx="40"
          cy="39"
          r="15"
          fill="#141212"
        />
      </svg>
    `;

    const text = document.createElement('span');
    text.className = 'pb-location-label';
    text.textContent = label;

    element.append(icon, text);

    element.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });

    return { element, text };
  }

  /* ==========================================
     CITY CLUSTERS
     ========================================== */

  const cityMarkers = new Map();

  function addCitySource() {
    map.addSource('pb-cities', {
      type: 'geojson',

      data: {
        type: 'FeatureCollection',

        features: cities.map((c) => ({
          type: 'Feature',

          properties: {
            cityId: c.id,
            count: c.count,
          },

          geometry: {
            type: 'Point',
            coordinates: [c.lng, c.lat],
          },
        })),
      },

      cluster: true,
      clusterRadius: MOBILE ? 52 : 62,
      clusterMaxZoom: 8,
      clusterMinPoints: 2,

      clusterProperties: {
        booths: ['+', ['get', 'count']],
      },
    });

    map.addLayer({
      id: 'pb-city-query',
      type: 'circle',
      source: 'pb-cities',

      maxzoom: 9,

      paint: {
        'circle-radius': 4,
        'circle-color': C.black,
        'circle-opacity': 0.001,
      },
    });
  }

  function openCity(city) {
    closeBoothCard();

    map.flyTo({
      center: [city.lng, city.lat],
      zoom: 10.5,
      speed: 0.75,
      essential: true,
    });
  }

  function updateCityMarkers() {
    const visible = new Map();

    if (map.getZoom() < 9 && map.getLayer('pb-city-query')) {
      const features = map.queryRenderedFeatures({
        layers: ['pb-city-query'],
      });

      for (const f of features) {
        const p = f.properties;

        const key = p.cluster ? `cluster-${p.cluster_id}` : `city-${p.cityId}`;

        if (!visible.has(key)) {
          visible.set(key, f);
        }
      }
    }

    for (const [key, item] of cityMarkers) {
      if (!visible.has(key)) {
        item.marker.remove();
        cityMarkers.delete(key);
      }
    }

    for (const [key, feature] of visible) {
      if (cityMarkers.has(key)) continue;

      const p = feature.properties;
      const cluster = Boolean(p.cluster);

      let city = null;
      let element;

      if (cluster) {
        element = document.createElement('button');

        element.type = 'button';
        element.className = 'pb-cluster';

        const count = Number(p.booths ?? p.point_count);

        element.textContent = String(count);

        element.setAttribute('aria-label', `${count} photobooths`);

        element.addEventListener('click', async (e) => {
          e.stopPropagation();

          try {
            const zoom = await map
              .getSource('pb-cities')
              .getClusterExpansionZoom(Number(p.cluster_id));

            map.easeTo({
              center: feature.geometry.coordinates,
              zoom: Math.min(zoom + 0.3, 9),
              duration: 750,
              essential: true,
            });
          } catch (error) {
            console.error('Cluster expansion:', error);
          }
        });
      } else {
        city = cityById.get(Number(p.cityId));

        if (!city) continue;

        element = makePin(cityName(city.name), () => openCity(city)).element;
      }

      const marker = new maplibregl.Marker({
        element,
        anchor: cluster ? 'center' : 'bottom',
      })
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);

      cityMarkers.set(key, {
        marker,
        element,
        city,
      });
    }

    for (const item of cityMarkers.values()) {
      item.element.classList.toggle('pb-label-visible', map.getZoom() >= 4);

      const label = item.element.querySelector('.pb-location-label');

      if (item.city && label) {
        label.textContent = cityName(item.city.name);
      }
    }
  }

  /* ==========================================
     CITY LABELS + INDIVIDUAL BOOTHS
     ========================================== */

  const cityLabels = [];
  const boothMarkers = [];

  function addDetailedMarkers() {
    const withBooths = new Set(booths.map((b) => b.city));

    for (const city of cities.filter((c) => withBooths.has(c.name))) {
      const element = document.createElement('span');

      element.className = 'pb-city-map-name';
      element.textContent = cityName(city.name);

      new maplibregl.Marker({
        element,
        anchor: 'center',
      })
        .setLngLat([city.lng, city.lat])
        .addTo(map);

      cityLabels.push({
        city,
        element,
      });
    }

    for (const booth of booths) {
      const pin = makePin(booth.name, () => openBooth(booth));

      new maplibregl.Marker({
        element: pin.element,
        anchor: 'bottom',
      })
        .setLngLat([booth.lng, booth.lat])
        .addTo(map);

      boothMarkers.push({
        booth,
        element: pin.element,
      });
    }

    updateDetailVisibility();
  }

  function updateDetailVisibility() {
    const zoom = map.getZoom();

    for (const item of boothMarkers) {
      item.element.style.display = zoom >= 9 ? '' : 'none';

      item.element.classList.toggle('pb-label-visible', zoom >= 12);
    }

    for (const item of cityLabels) {
      item.element.style.display = zoom >= 9 && zoom < 13 ? '' : 'none';

      item.element.textContent = cityName(item.city.name);
    }
  }

  /* ==========================================
     BUILDING HIGHLIGHT
     ========================================== */

  const buildingCache = new Map();
  const pending = new Map();
  const highlighted = new Map();

  function pointInRing(lng, lat, ring) {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];

      if (
        a[1] > lat !== b[1] > lat &&
        lng < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0]
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  function validRing(ring) {
    return (
      Array.isArray(ring) &&
      ring.length >= 4 &&
      ring.every(
        (p) =>
          Array.isArray(p) &&
          Number.isFinite(Number(p[0])) &&
          Number.isFinite(Number(p[1])),
      )
    );
  }

  async function fetchBuilding(booth) {
    if (buildingCache.has(booth.id)) {
      return buildingCache.get(booth.id);
    }

    let feature = null;

    const manual = booth.buildingPolygon;

    if (manual?.type === 'Polygon' && validRing(manual.coordinates?.[0])) {
      feature = {
        type: 'Feature',
        properties: {
          boothId: booth.id,
        },
        geometry: manual,
      };
    } else {
      const query = `
        [out:json][timeout:20];
        way(around:80,${booth.lat},${booth.lng})
          ["building"];
        out geom;
      `;

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          data: query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Overpass ${response.status}`);
      }

      const data = await response.json();

      const matches = (data.elements || [])
        .filter((e) => e.type === 'way' && Array.isArray(e.geometry))
        .map((e) => ({
          type: 'Feature',
          properties: {
            boothId: booth.id,
            osmId: e.id,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [e.geometry.map((p) => [p.lon, p.lat])],
          },
        }))
        .filter(
          (f) =>
            validRing(f.geometry.coordinates[0]) &&
            pointInRing(booth.lng, booth.lat, f.geometry.coordinates[0]),
        );

      if (matches.length === 1) {
        feature = matches[0];
      }
    }

    buildingCache.set(booth.id, feature);

    return feature;
  }

  function updateHighlighted() {
    const source = map.getSource('pb-buildings');

    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [...highlighted.values()],
      });
    }
  }

  async function ensureBuilding(booth) {
    if (pending.has(booth.id)) {
      return pending.get(booth.id);
    }

    if (buildingCache.has(booth.id)) return;

    const task = fetchBuilding(booth)
      .then((feature) => {
        if (feature) {
          highlighted.set(booth.id, feature);
          updateHighlighted();
        }
      })
      .catch((error) => {
        console.warn('Building outline:', booth.name, error);
      })
      .finally(() => {
        pending.delete(booth.id);
      });

    pending.set(booth.id, task);

    return task;
  }

  function addBuildingLayers() {
    map.addSource('pb-buildings', {
      type: 'geojson',
      data: empty(),
    });

    map.addLayer({
      id: 'pb-highlight-fill',
      type: 'fill',
      source: 'pb-buildings',

      minzoom: 11,

      paint: {
        'fill-color': C.yellow,
        'fill-opacity': 1,
      },
    });

    map.addLayer({
      id: 'pb-highlight-outline',
      type: 'line',
      source: 'pb-buildings',

      minzoom: 11,

      paint: {
        'line-color': C.black,
        'line-width': 1.8,
      },
    });

    map.on('click', 'pb-highlight-fill', (e) => {
      const booth = boothById.get(String(e.features?.[0]?.properties?.boothId));

      if (booth) openBooth(booth);
    });

    map.on('mouseenter', 'pb-highlight-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'pb-highlight-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  function loadNearbyBuildings() {
    if (map.getZoom() < 11) return;

    const bounds = map.getBounds();

    booths
      .filter((b) => bounds.contains([b.lng, b.lat]))
      .slice(0, 12)
      .forEach(ensureBuilding);
  }

  /* ==========================================
     PHOTOBOOTH CARD
     ========================================== */

  let activeBooth = null;

  function closeBoothCard() {
    activeBooth = null;

    const card = document.getElementById('boothCard');

    if (card) card.hidden = true;
  }

  function openBooth(booth) {
    activeBooth = booth;

    map.flyTo({
      center: [booth.lng, booth.lat],
      zoom: Math.max(map.getZoom(), 15),
      speed: 0.75,
      essential: true,
    });

    ensureBuilding(booth);
    renderBoothCard();
  }

  function renderBoothCard() {
    if (!activeBooth) return;

    const card = document.getElementById('boothCard');

    const content = document.getElementById('boothCardContent');

    if (!card || !content) return;

    content.replaceChildren();

    const h = document.createElement('h2');
    h.textContent = activeBooth.name;

    const c = document.createElement('p');
    c.textContent = cityName(activeBooth.city);

    content.append(h, c);

    for (const key of ['address', 'floor']) {
      if (activeBooth[key]) {
        const p = document.createElement('p');
        p.textContent = activeBooth[key];
        content.append(p);
      }
    }

    if (activeBooth.image) {
      const img = document.createElement('img');

      img.src = activeBooth.image;
      img.alt = activeBooth.name;
      img.className = 'pb-booth-image';
      img.loading = 'lazy';

      content.append(img);
    }

    const a = document.createElement('a');
    a.className = 'pb-directions';

    a.textContent = english() ? 'GET DIRECTIONS ↗' : 'КАК ДОБРАТЬСЯ ↗';

    a.href =
      'https://yandex.ru/maps/?rtext=~' +
      encodeURIComponent(`${activeBooth.lat},${activeBooth.lng}`) +
      '&rtt=auto';

    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    content.append(a);
    card.hidden = false;
  }

  /* ==========================================
     COUNTER / HERO / SEARCH
     ========================================== */

  const panel = document.getElementById('searchPanel');

  const input = document.getElementById('searchInput');

  const results = document.getElementById('searchResults');

  function updateCounter() {
    const counter = document.getElementById('boothCount');

    if (!counter) return;

    const total = cities.reduce((sum, c) => sum + c.count, 0);

    counter.textContent = english()
      ? `${total} PHOTOBOOTHS`
      : `${total} ФОТОБУДОК`;
  }

  function updateHero() {
    document
      .querySelector('.map-heading')
      ?.classList.toggle('pb-hero-hidden', map.getZoom() >= 4);
  }

  function addSearchResult(label, action) {
    if (!results) return;

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'search-result';
    button.textContent = label;

    button.addEventListener('click', () => {
      if (panel) panel.hidden = true;
      action();
    });

    results.append(button);
  }

  function renderSearch() {
    if (!results || !input) return;

    const query = input.value.trim().toLocaleLowerCase();

    results.replaceChildren();

    if (!query) return;

    cities
      .filter(
        (c) =>
          c.name.toLocaleLowerCase().includes(query) ||
          cityName(c.name).toLocaleLowerCase().includes(query),
      )
      .forEach((c) => {
        addSearchResult(cityName(c.name), () => openCity(c));
      });

    booths
      .filter(
        (b) =>
          b.name.toLocaleLowerCase().includes(query) ||
          cityName(b.city).toLocaleLowerCase().includes(query),
      )
      .forEach((b) => {
        addSearchResult(`${b.name} · ${cityName(b.city)}`, () => openBooth(b));
      });
  }

  /* ==========================================
     LOAD MAP
     ========================================== */

  map.on('load', async () => {
    try {
      await addWorld();
    } catch (error) {
      console.error('Country geography:', error);
    }

    try {
      addCityDetails();
    } catch (error) {
      console.error('City vector layers:', error);
    }

    addCitySource();
    addBuildingLayers();
    addDetailedMarkers();

    updateCounter();
    updateHero();
    updateDetailVisibility();

    map.resize();
  });

  map.on('idle', updateCityMarkers);

  map.on('moveend', () => {
    updateDetailVisibility();
    loadNearbyBuildings();
  });

  map.on('zoom', () => {
    updateHero();
    updateDetailVisibility();
  });

  map.on('error', (e) => {
    console.error('Public Booth:', e.error);
  });

  /* ==========================================
     CONTROLS
     ========================================== */

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    map.zoomIn();
  });

  document.getElementById('zoomOut')?.addEventListener('click', () => {
    map.zoomOut();
  });

  document
    .getElementById('closeBoothCard')
    ?.addEventListener('click', closeBoothCard);

  document.getElementById('locateMe')?.addEventListener('click', () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 12,
        });
      },
      () => {
        alert(
          english()
            ? 'Location unavailable'
            : 'Не удалось определить местоположение',
        );
      },
    );
  });

  document.getElementById('searchToggle')?.addEventListener('click', () => {
    if (panel) panel.hidden = false;
    input?.focus();
  });

  document.getElementById('closeSearch')?.addEventListener('click', () => {
    if (panel) panel.hidden = true;
  });

  input?.addEventListener('input', renderSearch);

  /* LANGUAGE SWITCH */

  window.addEventListener('pb-language-change', () => {
    updateCounter();
    renderSearch();
    updateDetailVisibility();

    if (activeBooth) renderBoothCard();

    for (const item of cityMarkers.values()) {
      const label = item.element.querySelector('.pb-location-label');

      if (item.city && label) {
        label.textContent = cityName(item.city.name);
      }
    }
  });
})();
