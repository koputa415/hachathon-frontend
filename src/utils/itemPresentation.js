import { formatPrice } from './format.js'

export function itemCardProps(item) {
  return {
    title: item.title, categoryLabel: item.category, status: item.status,
    priceLabel: formatPrice(item.price),
    imageSrc: item.imageUrl, imageAlt: item.title,
  }
}
