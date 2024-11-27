import { supabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('thoughts')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting thought:', error)
    return NextResponse.json(
      { error: 'Failed to delete thought' }, 
      { status: 500 }
    )
  }
}

// Add GET method to handle static generation
export async function GET() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 })
} 