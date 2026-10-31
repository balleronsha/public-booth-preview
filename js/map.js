/* ==========================================
   PUBLIC BOOTH — MAP V16
   MINIMAL MAP / RU EN / WORLD / CITY / BOOTHS
   ========================================== */

(() => {
  'use strict';

  /* ==========================================
     SETTINGS
     ========================================== */

  const C = {
    // yellow: '#FFB700',
    land: '#FFF9EB',
    black: '#141212',
    border: '#D5CCBC',
    road: '#BEB4A6',
    building: '#EFE8DB',
  };

  const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

  const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

  const MOBILE = window.innerWidth <= 700;

  const WORLD_CENTER = MOBILE ? [38, 35] : [20, 35];
  const WORLD_ZOOM = MOBILE ? 0.8 : 1.65;

  const CITY_ZOOM = 11;
  const BOOTH_ZOOM = 15.5;

  const CITY_MARKER_MAX_ZOOM = 9;
  const BOOTH_MARKER_MIN_ZOOM = 9;

  /* ==========================================
     DATA
     ========================================== */

  const cities = (window.PUBLIC_BOOTH_CITIES || [])
    .map(([name, lat, lng, count], id) => ({
      id,
      name: String(name),
      lat: Number(lat),
      lng: Number(lng),
      count: Number(count),
    }))
    .filter(
      (city) =>
        Number.isFinite(city.lat) &&
        Number.isFinite(city.lng) &&
        Number.isFinite(city.count) &&
        Math.abs(city.lat) <= 90 &&
        Math.abs(city.lng) <= 180,
    );

  const booths = (window.PUBLIC_BOOTH_LOCATIONS || [])
    .filter(
      (booth) =>
        booth.status === 'active' && booth.lat != null && booth.lng != null,
    )
    .map((booth) => ({
      ...booth,
      lat: Number(booth.lat),
      lng: Number(booth.lng),
    }))
    .filter(
      (booth) =>
        Number.isFinite(booth.lat) &&
        Number.isFinite(booth.lng) &&
        Math.abs(booth.lat) <= 90 &&
        Math.abs(booth.lng) <= 180,
    );

  const cityById = new Map(cities.map((city) => [city.id, city]));

  const boothById = new Map(booths.map((booth) => [String(booth.id), booth]));

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

  function english() {
    return window.pbGetLanguage?.() === 'en';
  }

  function cityName(name) {
    return english() ? translations[name] || name : name;
  }

  function emptyGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /* ==========================================
     INITIALIZE MAP
     ========================================== */

  const map = new maplibregl.Map({
    container: 'map',

    // One geographical source at every zoom.
    style: MAP_STYLE,

    center: WORLD_CENTER,
    zoom: WORLD_ZOOM,

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
     COUNTRY LABELS
     ========================================== */

  const countryLayers = [];

  function isCountryLayer(layer) {
    if (layer.type !== 'symbol') {
      return false;
    }

    const id = layer.id.toLowerCase();

    const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

    // Liberty country-label layers.
    // Do not include state or region labels.
    return (
      id.includes('country') &&
      (sourceLayer === 'place' ||
        sourceLayer === '' ||
        sourceLayer === 'place_label')
    );
  }

  function updateMapLanguage() {
    const language = english() ? 'en' : 'ru';

    const nameField = language === 'en' ? 'name:en' : 'name:ru';

    const fallbackField = language === 'en' ? 'name_en' : 'name_ru';

    const layers = map.getStyle()?.layers || [];

    for (const layer of layers) {
      if (layer.type !== 'symbol') continue;
      if (layer.id.startsWith('pb-')) continue;

      const id = layer.id.toLowerCase();
      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

      const isCountry =
        id.includes('country') &&
        (sourceLayer === 'place' ||
          sourceLayer === 'place_label' ||
          sourceLayer === '');

      if (!isCountry) continue;

      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', nameField],
        ['get', fallbackField],
        ['get', 'name:latin'],
        ['get', 'name'],
      ]);

      map.setLayoutProperty(layer.id, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        9,
        3,
        10,
        6,
        11,
        9,
        12,
      ]);

      map.setPaintProperty(layer.id, 'text-color', '#665F55');

      map.setPaintProperty(layer.id, 'text-halo-color', '#FFF9EB');

      map.setPaintProperty(layer.id, 'text-halo-width', 0.5);
    }

    console.log('Public Booth map language:', language);
  }

  /* ==========================================
     MINIMAL BASEMAP DESIGN
     ========================================== */

  function styleBaseMap() {
    const style = map.getStyle();

    if (!style?.layers) {
      throw new Error('OpenFreeMap style is unavailable');
    }

    countryLayers.length = 0;

    for (const layer of style.layers) {
      const id = layer.id;
      const type = layer.type;

      const layerId = id.toLowerCase();

      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

      /* BACKGROUND */

      if (type === 'background') {
        map.setPaintProperty(id, 'background-color', C.land);

        continue;
      }

      /* REMOVE TERRAIN AND 3D */

      if (
        type === 'raster' ||
        type === 'hillshade' ||
        type === 'fill-extrusion' ||
        type === 'heatmap'
      ) {
        map.setLayoutProperty(id, 'visibility', 'none');

        continue;
      }

      /* ======================================
         COUNTRY NAMES ONLY
         ====================================== */

      if (type === 'symbol') {
        if (!isCountryLayer(layer)) {
          map.setLayoutProperty(id, 'visibility', 'none');

          continue;
        }

        countryLayers.push(id);

        map.setLayoutProperty(id, 'visibility', 'visible');

        // Smaller and calmer labels.
        map.setLayoutProperty(id, 'text-size', [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          9,
          3,
          10,
          6,
          11,
          9,
          12,
        ]);

        // Maintain the existing glyph/font source,
        // but reduce visual density.
        map.setPaintProperty(id, 'text-color', '#665F55');

        map.setPaintProperty(id, 'text-opacity', 0.9);

        map.setPaintProperty(id, 'text-halo-color', C.land);

        map.setPaintProperty(id, 'text-halo-width', 0.5);

        map.setPaintProperty(id, 'icon-opacity', 0);

        continue;
      }

      /* REMOVE DECORATIVE POINTS */

      if (type === 'circle') {
        map.setLayoutProperty(id, 'visibility', 'none');

        continue;
      }

      /* ======================================
         LAND / WATER / BUILDINGS
         ====================================== */

      /* LAND / SEAS / BUILDINGS */

      if (type === 'fill') {
        const isWater = sourceLayer === 'water';

        const isBuilding =
          sourceLayer === 'building' || layerId.includes('building');

        if (layer.paint?.['fill-pattern']) {
          map.setPaintProperty(id, 'fill-pattern', null);
        }

        let fillColor = C.land;

        if (isWater) {
          // Только моря и океаны жёлтые.
          // Озёра, реки, пруды и каналы — молочные.
          fillColor = [
            'case',
            ['==', ['get', 'class'], 'ocean'],
            C.yellow,
            C.land,
          ];
        } else if (isBuilding) {
          fillColor = C.building;
        }

        map.setPaintProperty(id, 'fill-color', fillColor);

        map.setPaintProperty(id, 'fill-opacity', 1);

        continue;
      }

      /* ======================================
         ROADS / BORDERS / WATERWAYS
         ====================================== */

      if (type === 'line') {
        const isWaterway =
          sourceLayer === 'waterway' ||
          layerId.includes('waterway') ||
          layerId.includes('river') ||
          layerId.includes('stream');

        const isBoundary =
          sourceLayer === 'boundary' ||
          layerId.includes('boundary') ||
          layerId.includes('admin') ||
          layerId.includes('border');

        const isBuilding =
          sourceLayer === 'building' || layerId.includes('building');

        let lineColor = C.road;
        let opacity = 0.7;

        if (isWaterway) {
          map.setLayoutProperty(id, 'visibility', 'none');
          continue;
        }

        if (layer.paint?.['line-pattern']) {
          map.setPaintProperty(id, 'line-pattern', null);
        }

        map.setPaintProperty(id, 'line-color', lineColor);

        if (!isWaterway && !isBoundary && !isBuilding) {
          map.setPaintProperty(id, 'line-width', [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            0.15,
            9,
            0.3,
            12,
            0.5,
            15,
            0.75,
            18,
            1.1,
          ]);
        }

        // Preserve native widths, filters and
        // zoom ranges for accurate geography.
      }
    }

    /* ==========================================
   CLEAN CITY MAP — REMOVE VISUAL NOISE
   ========================================== */

    for (const layer of map.getStyle().layers) {
      const id = layer.id.toLowerCase();

      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

      if (layer.type !== 'line') continue;

      const isBoundary =
        sourceLayer === 'boundary' ||
        id.includes('boundary') ||
        id.includes('admin');

      const isBuilding = sourceLayer === 'building' || id.includes('building');

      const isTransport =
        sourceLayer === 'transportation' ||
        id.includes('road') ||
        id.includes('highway') ||
        id.includes('street');

      const isWater = sourceLayer === 'waterway' || id.includes('waterway');

      // Убираем вспомогательные линии
      if (!isBoundary && !isBuilding && !isTransport && !isWater) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        continue;
      }

      // Убираем пунктиры и декоративные обводки
      if (layer.paint?.['line-dasharray']) {
        map.setPaintProperty(layer.id, 'line-dasharray', null);
      }

      if (isBuilding) {
        map.setPaintProperty(layer.id, 'line-color', '#CEC5B7');

        map.setPaintProperty(layer.id, 'line-width', 0.55);

        map.setPaintProperty(layer.id, 'line-opacity', 0.7);
      } else if (isTransport) {
        map.setPaintProperty(layer.id, 'line-color', '#BEB4A6');

        map.setPaintProperty(layer.id, 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          0.2,
          12,
          0.4,
          15,
          0.6,
          18,
          0.8,
        ]);

        map.setPaintProperty(layer.id, 'line-opacity', 0.65);
      }
    }

    /* ==========================================
   REMOVE GREEN AREAS — PUBLIC BOOTH
   ========================================== */

    for (const layer of map.getStyle().layers) {
      if (layer.id.startsWith('pb-')) continue;

      const id = layer.id.toLowerCase();

      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();

      const isGreenArea =
        sourceLayer === 'landuse' ||
        sourceLayer === 'landcover' ||
        sourceLayer === 'park' ||
        id.includes('park') ||
        id.includes('forest') ||
        id.includes('grass') ||
        id.includes('wood') ||
        id.includes('vegetation') ||
        id.includes('pitch') ||
        id.includes('golf') ||
        id.includes('garden');

      if (!isGreenArea) continue;

      if (layer.type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-pattern', null);

        map.setPaintProperty(layer.id, 'fill-color', C.land);

        map.setPaintProperty(layer.id, 'fill-opacity', 1);
      }

      if (layer.type === 'line') {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    }

    console.log('Public Booth: green areas removed');

    /* ==========================================
   REMOVE GREEN OUTLINES
   ========================================== */

    for (const layer of map.getStyle().layers) {
      if (layer.id.startsWith('pb-')) continue;

      const id = layer.id.toLowerCase();
      const source = String(layer['source-layer'] || '').toLowerCase();

      const isLandscape =
        source === 'landuse' ||
        source === 'landcover' ||
        source === 'park' ||
        id.includes('park') ||
        id.includes('forest') ||
        id.includes('wood') ||
        id.includes('grass') ||
        id.includes('green') ||
        id.includes('nature') ||
        id.includes('vegetation') ||
        id.includes('protected') ||
        id.includes('pitch') ||
        id.includes('garden');

      // Убираем обводку природных полигонов.
      if (layer.type === 'fill' && isLandscape) {
        map.setPaintProperty(layer.id, 'fill-color', C.land);

        map.setPaintProperty(layer.id, 'fill-outline-color', C.land);
      }

      // Скрываем линейные контуры природных зон.
      if (layer.type === 'line' && isLandscape) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    }

    console.log('Landscape outlines cleaned');

    // Localize country names immediately.
    updateMapLanguage();

    console.log('Public Booth: minimal basemap initialized');
  }

  /* ==========================================
     WORLD / CITY NAVIGATION
     ========================================== */

  let currentCity = null;
  let activeBooth = null;

  const backButton = document.createElement('button');

  backButton.id = 'pbBackToWorld';
  backButton.type = 'button';
  backButton.className = 'pb-back-world';
  backButton.hidden = true;

  const mapSection =
    document.querySelector('.map-section') ||
    document.getElementById('map')?.parentElement;

  mapSection?.append(backButton);

  function updateBackButton() {
    backButton.textContent = english() ? '← BACK TO WORLD' : '← НАЗАД К МИРУ';

    backButton.hidden = map.getZoom() < 8;
  }

  function closeBoothCard() {
    activeBooth = null;

    const card = document.getElementById('boothCard');

    if (card) {
      card.hidden = true;
    }
  }

  function backToWorld() {
    closeBoothCard();

    currentCity = null;

    map.flyTo({
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      speed: 0.85,
      curve: 1.2,
      essential: true,
    });
  }

  backButton.addEventListener('click', backToWorld);

  function openCity(city) {
    closeBoothCard();

    currentCity = city;

    map.flyTo({
      center: [city.lng, city.lat],
      zoom: CITY_ZOOM,
      speed: 0.8,
      curve: 1.2,
      essential: true,
    });
  }

  /* ==========================================
     PIN DESIGN
     ========================================== */

  function pinSVG() {
    return `
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
  }

  function makePin(label, onClick) {
    const element = document.createElement('button');

    element.type = 'button';
    element.className = 'pb-location';

    element.setAttribute('aria-label', label);

    const icon = document.createElement('span');

    icon.className = 'pb-location-icon';
    icon.innerHTML = pinSVG();

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

        features: cities.map((city) => ({
          type: 'Feature',

          properties: {
            cityId: city.id,
            count: city.count,
          },

          geometry: {
            type: 'Point',
            coordinates: [city.lng, city.lat],
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
      maxzoom: CITY_MARKER_MAX_ZOOM,

      paint: {
        'circle-radius': 4,
        'circle-color': C.black,
        'circle-opacity': 0.001,
      },
    });
  }

  function updateCityMarkers() {
    if (!map.getLayer('pb-city-query')) {
      return;
    }

    const visible = new Map();

    if (map.getZoom() < CITY_MARKER_MAX_ZOOM) {
      const features = map.queryRenderedFeatures({
        layers: ['pb-city-query'],
      });

      for (const feature of features) {
        const p = feature.properties || {};

        const key = p.cluster ? `cluster-${p.cluster_id}` : `city-${p.cityId}`;

        if (!visible.has(key)) {
          visible.set(key, feature);
        }
      }
    }

    /* REMOVE OLD MARKERS */

    for (const [key, item] of cityMarkers) {
      if (!visible.has(key)) {
        item.marker.remove();
        cityMarkers.delete(key);
      }
    }

    /* ADD MARKERS */

    for (const [key, feature] of visible) {
      if (cityMarkers.has(key)) {
        continue;
      }

      const p = feature.properties || {};
      const clustered = Boolean(p.cluster);

      let city = null;
      let element;

      if (clustered) {
        element = document.createElement('button');

        element.type = 'button';
        element.className = 'pb-cluster';

        const count = Number(p.booths ?? p.point_count);

        element.textContent = String(count);

        element.setAttribute('aria-label', `${count} photobooths`);

        element.addEventListener('click', async (event) => {
          event.stopPropagation();

          try {
            const source = map.getSource('pb-cities');

            const zoom = await source.getClusterExpansionZoom(
              Number(p.cluster_id),
            );

            map.easeTo({
              center: feature.geometry.coordinates,
              zoom: Math.min(Math.max(zoom + 2, map.getZoom() + 2), 8.5),
              duration: 1100,
              essential: true,
            });
          } catch (error) {
            console.error('Cluster expansion:', error);
          }
        });
      } else {
        city = cityById.get(Number(p.cityId));

        if (!city) {
          continue;
        }

        element = makePin(cityName(city.name), () => openCity(city)).element;
      }

      const marker = new maplibregl.Marker({
        element,
        anchor: clustered ? 'center' : 'bottom',
      })
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);

      cityMarkers.set(key, {
        marker,
        element,
        city,
      });
    }

    /* UPDATE LABELS */

    for (const item of cityMarkers.values()) {
      item.element.classList.toggle('pb-label-visible', map.getZoom() >= 4);

      if (item.city) {
        const label = item.element.querySelector('.pb-location-label');

        if (label) {
          label.textContent = cityName(item.city.name);
        }
      }
    }
  }

  /* ==========================================
     CITY NAMES / EXACT BOOTHS
     ========================================== */

  const cityLabels = [];
  const boothMarkers = [];

  function addDetailedMarkers() {
    const citiesWithBooths = new Set(booths.map((booth) => booth.city));

    for (const city of cities) {
      if (!citiesWithBooths.has(city.name)) {
        continue;
      }

      const element = document.createElement('span');

      element.className = 'pb-city-map-name';
      element.textContent = cityName(city.name);

      const marker = new maplibregl.Marker({
        element,
        anchor: 'center',
      })
        .setLngLat([city.lng, city.lat])
        .addTo(map);

      cityLabels.push({
        city,
        marker,
        element,
      });
    }

    for (const booth of booths) {
      const pin = makePin(booth.name, () => openBooth(booth));

      const marker = new maplibregl.Marker({
        element: pin.element,
        anchor: 'bottom',
      })
        .setLngLat([booth.lng, booth.lat])
        .addTo(map);

      boothMarkers.push({
        booth,
        marker,
        element: pin.element,
      });
    }

    updateDetailVisibility();
  }

  function updateDetailVisibility() {
    const zoom = map.getZoom();

    for (const item of boothMarkers) {
      item.element.style.display = zoom >= BOOTH_MARKER_MIN_ZOOM ? '' : 'none';

      item.element.classList.toggle('pb-label-visible', zoom >= 12);
    }

    for (const item of cityLabels) {
      item.element.style.display = zoom >= 9 && zoom < 13 ? '' : 'none';

      item.element.textContent = cityName(item.city.name);
    }

    updateBackButton();
  }

  /* ==========================================
     BUILDING HIGHLIGHT
     ========================================== */

  const buildingCache = new Map();
  const pendingBuildings = new Map();
  const highlightedBuildings = new Map();

  function validRing(ring) {
    return (
      Array.isArray(ring) &&
      ring.length >= 4 &&
      ring.every(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1])),
      )
    );
  }

  function pointInsideRing(lng, lat, ring) {
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

  async function getBuilding(booth) {
    if (buildingCache.has(booth.id)) {
      return buildingCache.get(booth.id);
    }

    let feature = null;

    const manual = booth.buildingPolygon;

    /* VERIFIED MANUAL POLYGON */

    if (
      manual &&
      manual.type === 'Polygon' &&
      validRing(manual.coordinates?.[0])
    ) {
      feature = {
        type: 'Feature',
        properties: {
          boothId: booth.id,
        },
        geometry: manual,
      };
    } else if (
      manual &&
      manual.type === 'MultiPolygon' &&
      Array.isArray(manual.coordinates)
    ) {
      feature = {
        type: 'Feature',
        properties: {
          boothId: booth.id,
        },
        geometry: manual,
      };
    } else {
      /* AUTOMATIC OSM BUILDING LOOKUP */

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
        throw new Error(`Overpass HTTP ${response.status}`);
      }

      const result = await response.json();

      const matches = (result.elements || [])
        .filter((item) => item.type === 'way' && Array.isArray(item.geometry))
        .map((item) => ({
          type: 'Feature',

          properties: {
            boothId: booth.id,
            osmId: item.id,
          },

          geometry: {
            type: 'Polygon',

            coordinates: [item.geometry.map((point) => [point.lon, point.lat])],
          },
        }))
        .filter((candidate) => {
          const ring = candidate.geometry.coordinates[0];

          return validRing(ring) && pointInsideRing(booth.lng, booth.lat, ring);
        });

      if (matches.length === 1) {
        feature = matches[0];
      }
    }

    buildingCache.set(booth.id, feature);

    return feature;
  }

  function updateBuildingSource() {
    const source = map.getSource('pb-highlight-buildings');

    if (!source) {
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: [...highlightedBuildings.values()],
    });
  }

  async function ensureBuilding(booth) {
    if (highlightedBuildings.has(booth.id)) {
      return;
    }

    if (pendingBuildings.has(booth.id)) {
      return pendingBuildings.get(booth.id);
    }

    if (buildingCache.has(booth.id)) {
      const cached = buildingCache.get(booth.id);

      if (cached) {
        highlightedBuildings.set(booth.id, cached);

        updateBuildingSource();
      }

      return;
    }

    const task = getBuilding(booth)
      .then((feature) => {
        if (feature) {
          highlightedBuildings.set(booth.id, feature);

          updateBuildingSource();
        }
      })
      .catch((error) => {
        console.warn('Building outline unavailable:', booth.name, error);
      })
      .finally(() => {
        pendingBuildings.delete(booth.id);
      });

    pendingBuildings.set(booth.id, task);

    return task;
  }

  function addBuildingLayers() {
    map.addSource('pb-highlight-buildings', {
      type: 'geojson',
      data: emptyGeoJSON(),
    });

    map.addLayer({
      id: 'pb-highlight-fill',
      type: 'fill',
      source: 'pb-highlight-buildings',
      minzoom: 11,

      paint: {
        'fill-color': C.yellow,
        'fill-opacity': 1,
      },
    });

    map.addLayer({
      id: 'pb-highlight-outline',
      type: 'line',
      source: 'pb-highlight-buildings',
      minzoom: 11,

      paint: {
        'line-color': C.black,
        'line-width': 1.8,
      },
    });

    map.on('click', 'pb-highlight-fill', (event) => {
      const id = String(event.features?.[0]?.properties?.boothId);

      const booth = boothById.get(id);

      if (booth) {
        openBooth(booth);
      }
    });

    map.on('mouseenter', 'pb-highlight-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'pb-highlight-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  function loadNearbyBuildings() {
    if (map.getZoom() < 11) {
      return;
    }

    const bounds = map.getBounds();

    booths
      .filter((booth) => bounds.contains([booth.lng, booth.lat]))
      .slice(0, 12)
      .forEach((booth) => {
        ensureBuilding(booth);
      });
  }

  /* ==========================================
     PHOTOBOOTH CARD
     ========================================== */

  function openBooth(booth) {
    activeBooth = booth;

    const city = cities.find((item) => item.name === booth.city);

    if (city) {
      currentCity = city;
    }

    map.flyTo({
      center: [booth.lng, booth.lat],
      zoom: Math.max(map.getZoom(), BOOTH_ZOOM),
      speed: 0.8,
      curve: 1.2,
      essential: true,
    });

    ensureBuilding(booth);
    renderBoothCard();
  }

  function renderBoothCard() {
    if (!activeBooth) {
      return;
    }

    const card = document.getElementById('boothCard');

    const content = document.getElementById('boothCardContent');

    if (!card || !content) {
      return;
    }

    content.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = activeBooth.name;

    const city = document.createElement('p');
    city.textContent = cityName(activeBooth.city);

    content.append(title, city);

    if (activeBooth.address) {
      const address = document.createElement('p');

      address.textContent = activeBooth.address;

      content.append(address);
    }

    if (activeBooth.floor) {
      const floor = document.createElement('p');
      floor.textContent = activeBooth.floor;
      content.append(floor);
    }

    if (activeBooth.image) {
      const image = document.createElement('img');

      image.src = activeBooth.image;
      image.alt = activeBooth.name;
      image.className = 'pb-booth-image';
      image.loading = 'lazy';

      content.append(image);
    }

    const link = document.createElement('a');
    link.className = 'pb-directions';

    link.textContent = english() ? 'GET DIRECTIONS ↗' : 'КАК ДОБРАТЬСЯ ↗';

    link.href =
      'https://yandex.ru/maps/?rtext=~' +
      encodeURIComponent(`${activeBooth.lat},${activeBooth.lng}`) +
      '&rtt=auto';

    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    content.append(link);

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

    if (!counter) {
      return;
    }

    const total = cities.reduce((sum, city) => sum + city.count, 0);

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
    if (!results) {
      return;
    }

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'search-result';
    button.textContent = label;

    button.addEventListener('click', () => {
      if (panel) {
        panel.hidden = true;
      }

      action();
    });

    results.append(button);
  }

  function renderSearch() {
    if (!input || !results) {
      return;
    }

    const query = input.value.trim().toLocaleLowerCase();

    results.replaceChildren();

    if (!query) {
      return;
    }

    cities
      .filter(
        (city) =>
          city.name.toLocaleLowerCase().includes(query) ||
          cityName(city.name).toLocaleLowerCase().includes(query),
      )
      .forEach((city) => {
        addSearchResult(cityName(city.name), () => openCity(city));
      });

    booths
      .filter(
        (booth) =>
          booth.name.toLocaleLowerCase().includes(query) ||
          booth.city.toLocaleLowerCase().includes(query) ||
          cityName(booth.city).toLocaleLowerCase().includes(query),
      )
      .forEach((booth) => {
        addSearchResult(`${booth.name} · ${cityName(booth.city)}`, () =>
          openBooth(booth),
        );
      });
  }

  /* ==========================================
     LOAD MAP
     ========================================== */

  let mapReady = false;

  map.on('load', () => {
    try {
      styleBaseMap();

      addCitySource();
      addBuildingLayers();
      addDetailedMarkers();

      mapReady = true;

      updateCounter();
      updateHero();
      updateDetailVisibility();

      map.resize();

      console.log('Public Booth map initialized');
    } catch (error) {
      console.error('Public Booth initialization:', error);
    }
  });

  map.on('idle', () => {
    if (!mapReady) {
      return;
    }

    updateCityMarkers();
  });

  map.on('moveend', () => {
    if (!mapReady) {
      return;
    }

    updateCityMarkers();
    updateDetailVisibility();
    loadNearbyBuildings();
  });

  map.on('zoom', () => {
    updateHero();
    updateDetailVisibility();
  });

  map.on('error', (event) => {
    console.error('Public Booth map:', event.error);
  });

  /* ==========================================
     CONTROLS
     ========================================== */

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    map.zoomIn({
      duration: 400,
    });
  });

  document.getElementById('zoomOut')?.addEventListener('click', () => {
    map.zoomOut({
      duration: 400,
    });
  });

  document
    .getElementById('closeBoothCard')
    ?.addEventListener('click', closeBoothCard);

  document.getElementById('locateMe')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 12,
          essential: true,
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

  /* SEARCH OPEN */

  document.getElementById('searchToggle')?.addEventListener('click', () => {
    if (panel) {
      panel.hidden = false;
    }

    renderSearch();
    input?.focus();
  });

  /* SEARCH CLOSE */

  document.getElementById('closeSearch')?.addEventListener('click', () => {
    if (panel) {
      panel.hidden = true;
    }
  });

  input?.addEventListener('input', renderSearch);

  /* ==========================================
     LANGUAGE SWITCH
     ========================================== */

  window.addEventListener('pb-language-change', () => {
    if (mapReady) {
      updateMapLanguage();
    }

    updateCounter();
    updateHero();
    updateDetailVisibility();
    renderSearch();

    if (activeBooth) {
      renderBoothCard();
    }

    for (const item of cityMarkers.values()) {
      if (!item.city) {
        continue;
      }

      const label = item.element.querySelector('.pb-location-label');

      if (label) {
        label.textContent = cityName(item.city.name);
      }
    }
  });

  /* ==========================================
   PUBLIC BOOTH — CLEAN STREETS
   ========================================== */

  function cleanCityGeometry() {
    if (!map.getStyle()?.layers) return;

    let hiddenCount = 0;

    for (const layer of map.getStyle().layers) {
      // Не трогаем наши слои фотобудок.
      if (layer.id.startsWith('pb-')) continue;

      const id = layer.id.toLowerCase();
      const source = String(layer['source-layer'] || '').toLowerCase();

      if (layer.type !== 'line') continue;

      // Оставляем административные границы.
      if (source === 'boundary') continue;

      // Контуры зданий оставляем тонкими.
      if (source === 'building' || id.includes('building')) {
        map.setPaintProperty(layer.id, 'line-color', '#C8C0B3');
        map.setPaintProperty(layer.id, 'line-width', 0.45);
        map.setPaintProperty(layer.id, 'line-opacity', 0.55);
        continue;
      }

      // Реки и ручьи скрываем как линии.
      if (
        source === 'waterway' ||
        id.includes('waterway') ||
        id.includes('river') ||
        id.includes('stream')
      ) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        hiddenCount++;
        continue;
      }

      // Всё, что не транспорт, убираем.
      if (source !== 'transportation') {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        hiddenCount++;
        continue;
      }

      // Скрываем второстепенные транспортные линии.
      if (
        id.includes('rail') ||
        id.includes('transit') ||
        id.includes('path') ||
        id.includes('pedestrian') ||
        id.includes('service') ||
        id.includes('track') ||
        id.includes('casing') ||
        id.includes('hatching') ||
        id.includes('tunnel')
      ) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        hiddenCount++;
        continue;
      }

      // Из транспортных слоёв оставляем
      // только обычные автомобильные дороги.
      if (!id.includes('road') && !id.includes('bridge')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        hiddenCount++;
        continue;
      }

      map.setPaintProperty(layer.id, 'line-color', '#BDB5A9');
      map.setPaintProperty(layer.id, 'line-opacity', 0.52);

      map.setPaintProperty(layer.id, 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        0.25,
        12,
        0.4,
        15,
        0.65,
        18,
        0.85,
      ]);

      // Убираем пунктир, если он был.
      if (layer.paint?.['line-dasharray']) {
        map.setPaintProperty(layer.id, 'line-dasharray', null);
      }
    }

    console.log('Public Booth: hidden line layers:', hiddenCount);
  }

  // Этот обработчик сработает после загрузки
  // основного стиля и наших слоёв.
  map.on('load', cleanCityGeometry);
})();
