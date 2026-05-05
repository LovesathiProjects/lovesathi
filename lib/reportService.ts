import { supabase } from './supabaseClient'

export interface ReportData {
  reporter_id: string
  reported_user_id: string
  match_type: 'matrimony'
  reason: string
  description?: string
  created_at: string
}

export async function reportUser(reportData: Omit<ReportData, 'created_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has already reported this user
    const { data: existingReport } = await supabase
      .from('user_reports')
      .select('id')
      .eq('reporter_id', reportData.reporter_id)
      .eq('reported_user_id', reportData.reported_user_id)
      .eq('match_type', reportData.match_type)
      .single()

    if (existingReport) {
      return { success: false, error: 'You have already reported this user' }
    }

    const { error } = await supabase
      .from('user_reports')
      .insert({
        ...reportData,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error reporting user:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error reporting user:', error)
    return { success: false, error: error.message }
  }
}

export const REPORT_REASONS = {
  matrimony: [
    'Inappropriate behavior',
    'Fake profile',
    'Spam or scam',
    'Harassment',
    'Misrepresentation',
    'Other'
  ]
} as const

export async function getUserReports(userId: string, matchType: 'matrimony'): Promise<ReportData[]> {
  try {
    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .eq('reported_user_id', userId)
      .eq('match_type', matchType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting user reports:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error getting user reports:', error)
    return []
  }
}
