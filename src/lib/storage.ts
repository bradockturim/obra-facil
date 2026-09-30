import { supabase } from './supabaseClient'

export async function uploadFile(bucket: string, userId: string, file: File) {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}

export function publicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
