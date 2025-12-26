'use client'

import Link from 'next/link'
import { Package, Link2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UnmappedProduct } from '@/types/dashboard'

interface UnmappedPreviewProps {
  products: UnmappedProduct[]
  totalCount: number
}

export function UnmappedPreview({ products, totalCount }: UnmappedPreviewProps) {
  // Don't render if no unmapped products
  if (products.length === 0 && totalCount === 0) return null

  return (
    <div className="mt-6 bg-bg-card border border-border-custom rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-border-custom">
        <h2 className="font-semibold text-[16px] flex items-center gap-2.5">
          Unmapped Products
          <Badge className="bg-accent-cyan-dim text-accent-cyan border-0 font-mono text-xs px-2 py-0.5 rounded-md">
            {totalCount}
          </Badge>
        </h2>
        <Link
          href="/products"
          className="text-[13px] text-accent-cyan hover:underline flex items-center gap-1 font-medium"
        >
          View Queue
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Products list */}
      <div className="p-2">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center gap-4 p-4 mx-1 my-1 rounded-xl border border-dashed border-border-custom hover:border-accent-cyan hover:bg-bg-tertiary transition-all duration-200 cursor-pointer"
          >
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-muted flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-text-primary truncate">
                {product.name}
              </div>
              <div className="text-xs text-text-muted font-mono mt-0.5">
                SKU: {product.sku}
              </div>
            </div>

            {/* Link BOM button */}
            <Button
              variant="secondary"
              size="sm"
              className="bg-bg-tertiary border-border text-text-primary hover:bg-bg-card shrink-0"
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Link BOM
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
