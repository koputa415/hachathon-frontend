import { useEffect, useRef } from 'react'

// 開いている間だけ <dialog> をマウントする。閉じたときの DOM には画像を残さない。
export function ImageLightbox({ src, title, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  return <dialog ref={dialog} className="ui-lightbox" aria-label={`${title}の写真を拡大表示`}
    onClose={onClose}
    onClick={event => { if (event.target !== event.currentTarget.querySelector('img')) dialog.current?.close() }}>
    <img className="ui-lightbox__image" src={src} alt={title} />
    <button type="button" className="ui-lightbox__close" aria-label="閉じる" onClick={() => dialog.current?.close()}>
      <span aria-hidden="true">×</span>
    </button>
  </dialog>
}
