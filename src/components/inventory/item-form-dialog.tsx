'use client'

import { useActionState, useEffect } from 'react'
import { createNpiItem, updateNpiItem, type ActionState } from '@/lib/actions/inventory'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { NpiItem, Category, Location } from '@/types/inventory'
import { toast } from 'sonner'

interface ItemFormDialogProps {
  item?: NpiItem | null
  categories: Category[]
  locations: Location[]
  onClose: () => void
  open?: boolean
}

export function ItemFormDialog({
  item,
  categories,
  locations,
  onClose,
  open
}: ItemFormDialogProps) {
  const isEdit = !!item
  const action = isEdit
    ? updateNpiItem.bind(null, item.id)
    : createNpiItem

  const [state, formAction, pending] = useActionState(action, {} as ActionState)

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      onClose()
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state, onClose])

  const isOpen = open !== undefined ? open : !!item

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[var(--bg-card)] border-[var(--border)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">
            {isEdit ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name" className="text-[var(--text-secondary)]">Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={item?.name}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id" className="text-[var(--text-secondary)]">Category *</Label>
              <Select name="category_id" defaultValue={item?.category_id ?? undefined} required>
                <SelectTrigger className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id" className="text-[var(--text-secondary)]">Location *</Label>
              <Select name="location_id" defaultValue={item?.location_id ?? undefined} required>
                <SelectTrigger className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count" className="text-[var(--text-secondary)]">Current Count *</Label>
              <Input
                id="count"
                name="count"
                type="number"
                min="0"
                step="any"
                required
                defaultValue={item?.count ?? 0}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uom" className="text-[var(--text-secondary)]">Unit of Measure *</Label>
              <Input
                id="uom"
                name="uom"
                required
                defaultValue={item?.uom ?? 'ea'}
                placeholder="ea, kg, L, box..."
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired_count" className="text-[var(--text-secondary)]">Desired Count</Label>
              <Input
                id="desired_count"
                name="desired_count"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.desired_count ?? ''}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_point" className="text-[var(--text-secondary)]">Reorder Point</Label>
              <Input
                id="reorder_point"
                name="reorder_point"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.reorder_point ?? ''}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost" className="text-[var(--text-secondary)]">Unit Cost ($) *</Label>
              <Input
                id="unit_cost"
                name="unit_cost"
                type="number"
                min="0"
                step="0.001"
                required
                defaultValue={item?.unit_cost ?? 0}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gram_conversion" className="text-[var(--text-secondary)]">
                Gram Conversion
                <span className="text-[var(--text-muted)] text-xs ml-1">(for ingredients)</span>
              </Label>
              <Input
                id="gram_conversion"
                name="gram_conversion"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.gram_conversion ?? ''}
                className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </div>

          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isEdit ? 'Save Changes' : 'Create Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
