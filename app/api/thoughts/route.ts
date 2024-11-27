import { supabase } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('thoughts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch thoughts:', error)
    return NextResponse.json({ error: 'Failed to fetch thoughts' }, { status: 500 })
  }
} 