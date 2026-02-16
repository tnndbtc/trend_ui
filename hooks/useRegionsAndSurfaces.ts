import { useState, useEffect } from 'react'
import type { Region, Surface } from '@/types/trend'
import { fetchRegions, fetchSurfaces } from '@/lib/api/trends'

interface UseRegionsAndSurfacesReturn {
  regions: Region[]
  surfaces: Surface[]
  buckets: string[]
  loading: boolean
  error: string | null
}

export function useRegionsAndSurfaces(selectedRegion?: string): UseRegionsAndSurfacesReturn {
  const [regions, setRegions] = useState<Region[]>([])
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch regions on mount
  useEffect(() => {
    async function loadRegions() {
      try {
        setLoading(true)
        const data = await fetchRegions(true)
        setRegions(data)
        setError(null)
      } catch (err) {
        console.error('Failed to load regions:', err)
        setError('Failed to load regions')
      } finally {
        setLoading(false)
      }
    }

    loadRegions()
  }, [])

  // Fetch surfaces when selected region changes
  useEffect(() => {
    if (!selectedRegion) {
      setSurfaces([])
      return
    }

    async function loadSurfaces() {
      try {
        const data = await fetchSurfaces(true, selectedRegion)
        setSurfaces(data)
        setError(null)
      } catch (err) {
        console.error('Failed to load surfaces:', err)
        setError('Failed to load surfaces')
      }
    }

    loadSurfaces()
  }, [selectedRegion])

  // Extract unique buckets from surfaces
  const buckets = Array.from(new Set(surfaces.map(s => s.bucket))).sort()

  return {
    regions,
    surfaces,
    buckets,
    loading,
    error,
  }
}
