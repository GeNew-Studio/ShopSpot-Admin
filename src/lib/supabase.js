import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kvonaxrmepckfhkntaas.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2b25heHJtZXBja2Zoa250YWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDMxMzMsImV4cCI6MjA4NDQ3OTEzM30.tfV7zSaqtcZRREFs9hQwIKokNImtx0BjLiGYxgRwgfI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
