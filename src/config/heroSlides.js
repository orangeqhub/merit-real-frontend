/**
 * Hero slides — loaded dynamically from CMS/API later.
 * Empty until content is managed in the backend.
 */
export const HERO_SLIDES = [];

export function getActiveHeroSlides(_now = new Date()) {
  return HERO_SLIDES.filter((s) => {
    if (s.status && s.status !== 'active') return false;
    return true;
  });
}
