export function itemCardProps(item) {
  return {
    title: item.title, categoryLabel: item.category,
    priceLabel: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(item.price),
    imageSrc: item.imageUrl, imageAlt: item.title,
  }
}
