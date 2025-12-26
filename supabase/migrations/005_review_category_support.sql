-- =============================================
-- Add category_id and sub_category_id support to complete_item_review
-- =============================================

create or replace function public.complete_item_review(
  p_item_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.npi_items as $$
declare
  v_item public.npi_items;
begin
  update public.npi_items
  set
    needs_review = false,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now(),
    updated_by = auth.uid(),
    -- Apply optional updates from jsonb
    count = coalesce((p_updates->>'count')::numeric, count),
    unit_cost = coalesce((p_updates->>'unit_cost')::numeric, unit_cost),
    uom = coalesce(p_updates->>'uom', uom),
    desired_count = coalesce((p_updates->>'desired_count')::numeric, desired_count),
    location_id = coalesce((p_updates->>'location_id')::uuid, location_id),
    category_id = coalesce((p_updates->>'category_id')::uuid, category_id),
    sub_category_id = coalesce((p_updates->>'sub_category_id')::uuid, sub_category_id),
    source = coalesce(p_updates->>'source', source),
    notes = coalesce(p_updates->>'notes', notes),
    is_active = coalesce((p_updates->>'is_active')::boolean, is_active)
  where id = p_item_id
  returning * into v_item;

  -- Log the review action
  perform public.log_audit_entry(
    auth.uid(),
    'item_reviewed',
    'npi_item',
    p_item_id,
    jsonb_build_object('updates', p_updates)
  );

  return v_item;
end;
$$ language plpgsql security definer;
