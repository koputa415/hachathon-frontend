import { Button, ItemCard } from '../components/index.js'
import './pages.css'
import './Home.css'

export default function Home({ items, onOpenItem }) {
  const featuredItem = items.find((item) => item.id === 1)

  return (
    <div className="page-stack">
      <section className="page-stack" aria-labelledby="home-title">
        <h1 id="home-title">まだ知らない趣味に、気軽に出会える。</h1>
        <p className="page-muted">趣味道具のフリマアプリ。試して合わなければ、また売れる。</p>
      </section>
      {featuredItem && (
        <section className="discovery-feature" aria-labelledby="discovery-title">
          <span className="discovery-feature__chip">まだ知らない趣味：カメラ</span>
          <h2 id="discovery-title">アウトドアの次は、景色を残す楽しみへ。</h2>
          <p>アウトドアで出会った景色を写真に残す楽しみが近いから。</p>
          <p className="page-muted">{featuredItem.title}</p>
          <Button className="discovery-feature__cta" onClick={() => onOpenItem(featuredItem.id)}>
            この趣味の道具を見てみる
          </Button>
        </section>
      )}
      <section className="page-stack" aria-labelledby="items-title">
        <h2 id="items-title">趣味の道具をさがす</h2>
        <div className="item-grid">
          {items.map((item) => <ItemCard key={item.id} {...item} href={`#/items/${item.id}`} />)}
        </div>
      </section>
    </div>
  )
}
