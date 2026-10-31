/* ==========================================
   PUBLIC BOOTH — RU / EN
   ========================================== */

(() => {
  'use strict';

  const translations = {
    ru: {
      hero: 'ВЕСЬ МИР —<br>ТВОЯ ФОТОБУДКА.',
      find: 'НАЙТИ ФОТОБУДКУ',
      footer: 'НАЙДИ СВОЮ ФОТОБУДКУ',
      searchPlaceholder: 'ГОРОД ИЛИ НАЗВАНИЕ',
      directions: 'КАК ДОБРАТЬСЯ ↗',
      booths: 'ФОТОБУДКИ',
      locateError: 'Не удалось определить местоположение',
      zoomIn: 'Приблизить карту',
      zoomOut: 'Отдалить карту',
      locate: 'Моё местоположение',
      closeSearch: 'Закрыть поиск',
      closeCard: 'Закрыть карточку',
      searchLabel: 'Поиск фотобудки',
    },

    en: {
      hero: 'THE WORLD IS<br>YOUR PHOTOBOOTH.',
      find: 'FIND A PHOTOBOOTH',
      footer: 'FIND YOUR PUBLIC BOOTH',
      searchPlaceholder: 'CITY OR LOCATION',
      directions: 'GET DIRECTIONS ↗',
      booths: 'PHOTOBOOTHS',
      locateError: 'Unable to determine your location',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      locate: 'My location',
      closeSearch: 'Close search',
      closeCard: 'Close location card',
      searchLabel: 'Search for a photobooth',
    },
  };

  function getSavedLanguage() {
    try {
      return localStorage.getItem('pb-language') === 'en' ? 'en' : 'ru';
    } catch {
      return 'ru';
    }
  }

  let language = getSavedLanguage();

  window.pbGetLanguage = () => language;

  window.pbT = (key) => translations[language][key] || key;

  function saveLanguage() {
    try {
      localStorage.setItem('pb-language', language);
    } catch {
      // Storage is optional.
    }
  }

  function updateLanguage() {
    document.documentElement.lang = language;

    const dictionary = translations[language];

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      const value = dictionary[key];

      if (!value) return;

      if (key === 'hero') {
        element.innerHTML = value;
      } else {
        element.textContent = value;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.dataset.i18nPlaceholder;

      if (dictionary[key]) {
        element.placeholder = dictionary[key];
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const key = element.dataset.i18nAria;

      if (dictionary[key]) {
        element.setAttribute('aria-label', dictionary[key]);
      }
    });

    const toggle = document.getElementById('languageToggle');

    if (toggle) {
      toggle.textContent = language.toUpperCase();

      toggle.setAttribute(
        'aria-label',
        language === 'ru' ? 'Switch to English' : 'Переключить на русский',
      );
    }

    window.dispatchEvent(
      new CustomEvent('pb-language-change', {
        detail: { language },
      }),
    );
  }

  document.getElementById('languageToggle')?.addEventListener('click', () => {
    language = language === 'ru' ? 'en' : 'ru';

    saveLanguage();
    updateLanguage();
  });

  updateLanguage();
})();
