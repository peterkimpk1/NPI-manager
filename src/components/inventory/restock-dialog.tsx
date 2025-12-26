'use client'

import { useActionState, useEffect } from 'react'
import { restockItem, type ActionState } from '@/lib/actions/inventory'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus } from 'lucide-react'
import type { NpiItem } from '@/types/inventory'
import { toast } from 'sonner'

interface RestockDialogProps {
  item: NpiItem | null
  onClose: () => void
}

export function RestockDialog({ item, onClose }: RestockDialogProps) {
  const restockWithId = item ? restockItem.bind(null, item.id) : async () => ({ error: 'No item' })
  const [state, formAction, pending] = useActionState(restockWithId, {} as ActionState)

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      onClose()
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state, onClose])

  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[var(--bg-card)] border-[var(--border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Restock Item</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Add inventory to <strong>{item.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Current Stock</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {item.count} {item.uom}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-[var(--text-secondary)]">
              Quantity to Add
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              step="any"
              required
              autoFocus
              placeholder={`Enter ${item.uom}`}
              className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[var(--text-secondary)]">
              Notes (optional)
            </Label>
            <Input
              id="notes"
              name="notes"
              placeholder="e.g., PO #12345"
              className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
