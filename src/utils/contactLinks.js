export function buildTelLink(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

export function buildWhatsAppLink(property, { lang = 'en', message } = {}) {
  const phone = String(property.contactPhone || '').replace(/[^\d]/g, '');
  const title = lang === 'te' && property.titleTe ? property.titleTe : property.titleEn;
  const location = lang === 'te' && property.locationTe ? property.locationTe : property.locationEn;
  const url = `${window.location.origin}/properties/${property.id}`;

  const text =
    message ||
    `Hello, I am interested in the property "${title}", Property ID: ${property.propertyCode}, Location: ${location}. ${url} Please share more details.`;

  return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
}
