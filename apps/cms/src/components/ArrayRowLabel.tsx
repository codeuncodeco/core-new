'use client'

import { useRowLabel } from '@payloadcms/ui'

type RowData = {
  title?: string
  label?: string
  item?: string
  milestone?: string
  name?: string
  email?: string
  note?: string
}

const truncate = (s: string, max = 60): string =>
  s.length > max ? `${s.slice(0, max).trimEnd()}…` : s

// Renders an array row's label using the first non-empty "headline-ish"
// field on the row. Falls back to "Item NN" when all are blank, so the row
// never goes title-less.
export const ArrayRowLabel = () => {
  const { data, rowNumber } = useRowLabel<RowData>()

  const candidate =
    data?.title ||
    data?.label ||
    data?.item ||
    data?.milestone ||
    data?.name ||
    data?.email ||
    (data?.note ? truncate(data.note) : undefined)

  if (candidate) return <>{candidate}</>

  const n = String((rowNumber ?? 0) + 1).padStart(2, '0')
  return <>Item {n}</>
}

export default ArrayRowLabel
