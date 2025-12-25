// Плавные переходы между страницами
(function() {
  'use strict';

  // Fade-in анимация при загрузке страницы
  document.addEventListener('DOMContentLoaded', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease-in-out';
    
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.body.style.opacity = '1';
      });
    });
  });

  // Функция для извлечения URL из onclick
  function getUrlFromOnclick(onclickStr) {
    const match = onclickStr.match(/location\.href\s*=\s*['"]([^'"]+)['"]|document\.location\s*=\s*['"]([^'"]+)['"]/);
    return match ? (match[1] || match[2]) : null;
  }

  // Перехватываем клики на ссылки и кнопки навигации
  document.addEventListener('click', function(e) {
    let target = e.target;
    let href = null;
    let isInternalLink = false;
    let isButton = false;
    
    // Проверяем, кликнули ли на ссылку
    if (target.tagName === 'A') {
      href = target.href;
      // Проверяем, что это внутренняя ссылка
      if (href && (href.includes(window.location.origin) || href.startsWith('/') || href.startsWith('../') || !href.includes('://'))) {
        // Пропускаем якоря на той же странице
        if (target.hash && target.pathname === window.location.pathname) {
          return;
        }
        // Пропускаем внешние ссылки
        if (href.includes('://') && !href.includes(window.location.origin)) {
          return;
        }
        isInternalLink = true;
      }
    }
    // Проверяем, кликнули ли на кнопку с onclick
    else {
      const button = target.closest('button[onclick]');
      if (button && button.onclick) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
          href = getUrlFromOnclick(onclickAttr);
          if (href && (href.startsWith('/') || href.startsWith('../') || href.startsWith('./'))) {
            isInternalLink = true;
            isButton = true;
          }
        }
      }
    }
    
    if (!isInternalLink || !href) return;
    
    // Предотвращаем стандартный переход
    e.preventDefault();
    e.stopPropagation();
    
    // Fade-out анимация
    document.body.style.transition = 'opacity 0.25s ease-in-out';
    document.body.style.opacity = '0';
    
    // Переход после анимации
    setTimeout(function() {
      if (isButton) {
        // Для кнопок используем относительный путь напрямую
        window.location.href = href;
      } else {
        // Для ссылок используем полный href
        window.location.href = href;
      }
    }, 250);
  }, true); // Используем capture phase для перехвата до всплытия
})();

