'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemFormDialog } from './item-form-dialog'
import { ReviewOnboarding } from './review-onboarding'
import type { Category, SubCategory, Location } from '@/types/inventory'

interface InventoryHeaderActionsProps {
  reviewCount: number
  categories: Category[]
  subCategories: SubCategory[]
  locations: Location[]
}

export function InventoryHeaderActions({
  reviewCount,
  categories,
  subCategories,
  locations,
}: InventoryHeaderActionsProps) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const handleReviewComplete = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      {reviewCount > 0 && (
        <Button
          variant="outline"
          onClick={() => setShowReview(true)}
          className="border-[var(--accent-yellow)] text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)]/10"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Review Queue ({reviewCount})
        </Button>
      )}
      <Button
        onClick={() => setShowAddDialog(true)}
        className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>

      <ItemFormDialog
        open={showAddDialog}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
        onClose={() => setShowAddDialog(false)}
      />

      <ReviewOnboarding
        open={showReview}
        onOpenChange={setShowReview}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
        onComplete={handleReviewComplete}
      />
    </>
  )
}
