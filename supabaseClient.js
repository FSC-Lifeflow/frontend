import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://qjtyzxnnhdaqwlqgquel.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdHl6eG5uaGRhcXdscWdxdWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTk3MDUsImV4cCI6MjA3MzE5NTcwNX0.-JF4YfWG0emUleBVKRGDVaf3OI9Ddy8yp6k5vVXQP4s"

export const supabase = createClient(supabaseUrl, supabaseKey)
