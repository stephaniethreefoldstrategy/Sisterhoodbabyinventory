import { useRef, useState } from 'react'
import { signPhotos, uploadPhoto } from '../lib/photos'
import { photoFromLink } from '../lib/linkPhoto'
import { CATEGORIES, type Item, type ItemPatch, type Member } from '../types'
import { Modal } from './Modal'

const SOMEONE = '__someone'

interface Props {
  item?: Item
  me: Member
  members: Member[]
  photoUrl?: string
  onSave: (patch: ItemPatch & { name: string }) => Promise<void>
  onClose: () => void
}

export function ItemForm({ item, me, members, photoUrl, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [link, setLink] = useState(item?.product_link ?? '')
  const [ownerId, setOwnerId] = useState(item?.owner_id ?? me.id)
  const [holderId, setHolderId] = useState(item?.holder_name ? SOMEONE : item?.holder_id ?? item?.owner_id ?? me.id)
  const [holderName, setHolderName] = useState(item?.holder_name ?? '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [availabilityNote, setAvailabilityNote] = useState(item?.availability_note ?? '')
  const [linkPhoto, setLinkPhoto] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [holderTouched, setHolderTouched] = useState(!!item)
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? null)
  const [preview, setPreview] = useState<string | undefined>(photoUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Free product lookup: Google Lens with the photo, or a Google search by name
  const openLens = async () => {
    if (!photoPath) return
    const tab = window.open('', '_blank')
    const url = (await signPhotos([photoPath]))[photoPath]
    if (tab && url) tab.location.href = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`
    else tab?.close()
  }
  const searchByName = () =>
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name.trim())}`, '_blank', 'noopener')

  const normaliseLink = (raw: string) => {
    const url = raw.trim()
    return url && !/^https?:\/\//i.test(url) ? `https://${url}` : url
  }

  // No photo yet but there's a product link: borrow the shop's product photo
  const fetchLinkPhoto = async (raw = link): Promise<string | null> => {
    const url = normaliseLink(raw)
    if (!url || photoPath || uploading || photoRemoved) return photoPath
    setLinkPhoto('loading')
    const path = await photoFromLink(url)
    if (!path) {
      setLinkPhoto('failed')
      return null
    }
    setPhotoPath(path)
    setPreview((await signPhotos([path]))[path])
    setLinkPhoto('idle')
    return path
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      setPhotoPath(await uploadPhoto(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed')
      setPreview(photoUrl)
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const url = normaliseLink(link)
    const outside = holderId === SOMEONE
    try {
      const photo = photoPath ?? (url && linkPhoto !== 'failed' ? await fetchLinkPhoto(url) : null)
      await onSave({
        name: name.trim(),
        category: category || 'Other',
        description: description.trim(),
        product_link: url || null,
        photo_path: photo,
        owner_id: ownerId,
        holder_id: outside ? null : holderId,
        holder_name: outside ? holderName.trim() || null : null,
        available,
        availability_note: available ? null : availabilityNote.trim() || null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add an item'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <button type="button" className={`photo-drop ${preview ? 'has-photo' : ''}`} onClick={() => fileRef.current?.click()}>
          {preview ? <img src={preview} alt="" /> : <span>+ Add a photo</span>}
          {uploading && <span className="photo-busy">Uploading…</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        {preview && (
          <div className="row gap">
            <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>
              Change photo
            </button>
            <button type="button" className="link-btn" onClick={() => { setPhotoPath(null); setPreview(undefined); setPhotoRemoved(true) }}>
              Remove photo
            </button>
          </div>
        )}

        <label>
          Item
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bugaboo pram" />
        </label>
        <div className="label-text">
          Category
          <div className="chips" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                className={`chip ${category === c ? 'on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <label>
          Description
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Size, age range, condition, bits included…" />
        </label>
        <label>
          Link to product <span className="muted">(optional)</span>
          <input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => { setLink(e.target.value); setLinkPhoto('idle') }}
            onBlur={() => fetchLinkPhoto()}
            placeholder="https://…"
          />
        </label>
        {linkPhoto === 'loading' && (
          <p className="muted small row gap"><span className="spinner" aria-hidden="true" /> Getting the photo from that link…</p>
        )}
        {linkPhoto === 'failed' && !photoPath && (
          <p className="muted small">Couldn't get a photo from that link. You can still add one yourself.</p>
        )}
        {(photoPath || name.trim()) && !link.trim() && (
          <div className="find-product">
            <span className="muted small">Find the product page:</span>
            {photoPath && (
              <button type="button" className="chip" onClick={openLens}>
                Search photo with Google Lens ↗
              </button>
            )}
            {name.trim() && (
              <button type="button" className="chip" onClick={searchByName}>
                Google “{name.trim()}” ↗
              </button>
            )}
            <span className="muted tiny">Copy the link of the right product and paste it above.</span>
          </div>
        )}
        <div className="two-col">
          <label>
            Who owns it
            <select
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value)
                if (!holderTouched) setHolderId(e.target.value)
              }}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </label>
          <label>
            Who has it now
            <select value={holderId} onChange={(e) => { setHolderId(e.target.value); setHolderTouched(true) }}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
              <option value={SOMEONE}>Someone else…</option>
            </select>
          </label>
        </div>
        {holderId === SOMEONE && (
          <label>
            Their name
            <input required value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="e.g. Mum, Jess from mothers group" />
          </label>
        )}
        <div className="label-text">
          Can it be borrowed?
          <div className="avail-toggle" role="radiogroup" aria-label="Availability">
            <button type="button" role="radio" aria-checked={available} className={available ? 'on' : ''} onClick={() => setAvailable(true)}>
              Available
            </button>
            <button type="button" role="radio" aria-checked={!available} className={!available ? 'on off' : ''} onClick={() => setAvailable(false)}>
              Not available
            </button>
          </div>
        </div>
        {!available && (
          <label>
            Why not? <span className="muted">(optional)</span>
            <input value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="e.g. Using it myself, needs repair" />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary wide" disabled={saving || uploading || linkPhoto === 'loading' || !name.trim()}>
          {saving ? 'Saving…' : item ? 'Save changes' : 'Add to inventory'}
        </button>
      </form>
    </Modal>
  )
}
