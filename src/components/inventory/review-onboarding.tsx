'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, X, Archive, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewItem {
  id: string
  name: string
  category_name: string
  sub_category_name: string | null
  location_name: string
  count: number
  uom: string
  unit_cost: number | null
  desired_count: number | null
  source: string | null
  review_source: string | null
  notes: string | null
}

interface ReviewOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: { id: string; name: string }[]
  onComplete: () => void
}

export function ReviewOnboarding({
  open,
  onOpenChange,
  locations,
  onComplete,
}: ReviewOnboardingProps) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [count, setCount] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [uom, setUom] = useState('')
  const [desiredCount, setDesiredCount] = useState('')
  const [locationId, setLocationId] = useState('')
  const [source, setSource] = useState('')

  const currentItem = items[currentIndex]
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0

  useEffect(() => {
    if (open) {
      fetchReviewItems()
    }
  }, [open])

  useEffect(() => {
    if (currentItem) {
      setCount(currentItem.count?.toString() || '')
      setUnitCost(currentItem.unit_cost?.toString() || '')
      setUom(currentItem.uom || 'ea')
      setDesiredCount(currentItem.desired_count?.toString() || '')
      setLocationId(locations.find(l => l.name === currentItem.location_name)?.id || '')
      setSource(currentItem.source || '')
    }
  }, [currentItem, locations])

  async function fetchReviewItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/npi/review')
      if (!res.ok) throw new Error('Failed to fetch review items')
      const data = await res.json()
      setItems(data)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Failed to fetch review items:', error)
      toast.error('Failed to load review items')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: 'complete' | 'skip' | 'archive') {
    if (!currentItem) return

    setSaving(true)
    try {
      const updates = action === 'complete' ? {
        count: count ? parseFloat(count) : null,
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        uom,
        desired_count: desiredCount ? parseFloat(desiredCount) : null,
        location_id: locationId || null,
        source: source || null,
      } : undefined

      const res = await fetch('/api/npi/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: currentItem.id,
          action,
          updates,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to process review')
      }

      // Show success toast
      const actionMessage = action === 'complete' ? 'Item confirmed'
        : action === 'archive' ? 'Item archived'
        : 'Item skipped'
      toast.success(actionMessage)

      // Remove the item from the list
      const newItems = items.filter((_, i) => i !== currentIndex)
      setItems(newItems)

      // Adjust index if needed
      if (newItems.length === 0) {
        onOpenChange(false)
        onComplete()
      } else if (currentIndex >= newItems.length) {
        setCurrentIndex(newItems.length - 1)
      }
    } catch (error) {
      console.error('Failed to process review:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process review')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-[var(--bg-card)] border-[var(--border)]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-cyan)]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] bg-[var(--bg-card)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">All Caught Up!</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--text-secondary)]">No items need review at this time.</p>
          <Button
            onClick={() => onOpenChange(false)}
            className="mt-4 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 text-white"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-[var(--bg-card)] border-[var(--border)]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[var(--text-primary)]">Review Onboarding</DialogTitle>
            <Badge variant="outline" className="bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] border-[var(--accent-cyan)]">
              {currentIndex + 1} of {items.length}
            </Badge>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-[var(--bg-tertiary)] rounded-full mt-4">
            <div
              className="h-1 bg-[var(--accent-cyan)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </DialogHeader>

        {currentItem && (
          <div className="space-y-6 py-4">
            {/* Item header */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{currentItem.name}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]">
                  {currentItem.category_name}
                </Badge>
                {currentItem.sub_category_name && (
                  <Badge variant="outline" className="border-[var(--border)] text-[var(--text-secondary)]">
                    {currentItem.sub_category_name}
                  </Badge>
                )}
                {currentItem.review_source && (
                  <Badge className="bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)]">
                    From: {currentItem.review_source}
                  </Badge>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Current Stock</Label>
                <Input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">UOM</Label>
                <Input
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                  placeholder="ea"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Desired Stock</Label>
                <Input
                  type="number"
                  value={desiredCount}
                  onChange={(e) => setDesiredCount(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Source/Vendor</Label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                  placeholder="Vendor name or URL"
                />
              </div>
            </div>

            {/* Notes */}
            {currentItem.notes && (
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)]">
                <Label className="text-[var(--text-muted)] text-xs">Notes</Label>
                <p className="text-[var(--text-secondary)] text-sm mt-1">{currentItem.notes}</p>
              </div>
            )}

            {/* Navigation and actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="text-[var(--text-secondary)]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
                  disabled={currentIndex === items.length - 1}
                  className="text-[var(--text-secondary)]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('archive')}
                  disabled={saving}
                  className="border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Not In Use
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('skip')}
                  disabled={saving}
                  className="border-[var(--border)] text-[var(--text-secondary)]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction('complete')}
                  disabled={saving}
                  className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90 text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Confirm & Next
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
