export type Colour = 'pink' | 'butter' | 'matcha' | 'latte' | 'plum' | 'peach'

export const COLOURS: { key: Colour; label: string; hex: string; ink: string }[] = [
  { key: 'pink', label: 'French Tips', hex: '#FFD6EB', ink: '#5F1D3E' },
  { key: 'butter', label: 'Very Buttery', hex: '#FFF5B4', ink: '#5F1D3E' },
  { key: 'matcha', label: 'Matcha Coded', hex: '#939E86', ink: '#FFFFFF' },
  { key: 'latte', label: 'Cloudy Latte', hex: '#CAE4EF', ink: '#5F1D3E' },
  { key: 'plum', label: 'Deep Plum', hex: '#5F1D3E', ink: '#FFA873' },
  { key: 'peach', label: 'Peach', hex: '#FFA873', ink: '#5F1D3E' },
]

export const colourOf = (key: string | undefined) => COLOURS.find((c) => c.key === key) ?? COLOURS[0]

export interface Member {
  id: string
  email: string
  display_name: string
  colour: Colour
  created_at: string
}

export interface Item {
  id: string
  name: string
  description: string
  product_link: string | null
  photo_path: string | null
  owner_id: string | null
  holder_id: string | null
  archived: boolean
  archive_reason: string | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ItemAction = 'created' | 'updated' | 'handed_over' | 'archived' | 'unarchived' | 'deleted' | 'undeleted'

export interface ItemEvent {
  id: number
  item_id: string
  actor_id: string | null
  action: ItemAction
  before: Item | null
  after: Item | null
  created_at: string
}

// Fields an undo is allowed to write back
export const EDITABLE_FIELDS = [
  'name',
  'description',
  'product_link',
  'photo_path',
  'owner_id',
  'holder_id',
  'archived',
  'archive_reason',
  'deleted_at',
] as const

export type ItemPatch = Partial<Pick<Item, (typeof EDITABLE_FIELDS)[number]>>

export const snapshot = (item: Item): ItemPatch =>
  Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, item[f]])) as ItemPatch

export const ARCHIVE_REASONS = ['Thrown away', 'Given away', 'Sold', 'Not using anymore', 'Broken'] as const
