import { useRef, useState } from 'react'
import { uploadPhoto } from '../lib/photos'
import { CATEGORIES, type Item, type ItemPatch, type Member } from '../types'
import { Modal } from './Modal'

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
  const [holderId, setHolderId] = useState(item?.holder_id ?? item?.owner_id ?? me.id)
  const [holderTouched, setHolderTouched] = useState(!!item)
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? null)
  const [preview, setPreview] = useState<string | undefined>(photoUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    let url = link.trim()
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      await onSave({
        name: name.trim(),
        category: category || 'Other',
        description: description.trim(),
        product_link: url || null,
        photo_path: photoPath,
        owner_id: ownerId,
        holder_id: holderId,
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
            <button type="button" className="link-btn" onClick={() => { setPhotoPath(null); setPreview(undefined) }}>
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
          <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </label>
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
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary wide" disabled={saving || uploading || !name.trim()}>
          {saving ? 'Saving…' : item ? 'Save changes' : 'Add to inventory'}
        </button>
      </form>
    </Modal>
  )
}
