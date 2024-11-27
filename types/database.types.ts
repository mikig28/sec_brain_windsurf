export type Database = {
  public: {
    Tables: {
      links: {
        Row: {
          id: number
          url: string
          title: string
          created_at: string
        }
        Insert: {
          url: string
          title: string
          created_at: string
        }
      }
      videos: {
        Row: {
          id: number
          url: string
          video_id: string
          timestamp: string
          type?: string
          image_url?: string
        }
        Insert: {
          url: string
          video_id: string
          timestamp: string
          type?: string
          image_url?: string
        }
      }
      entries: {
        Row: {
          id: string
          title: string
          content: string
          type: string
          created_at: string
          updated_at: string
          source: string
          status: string
          tags?: string[]
        }
        Insert: {
          title: string
          content: string
          type: string
          created_at: string
          updated_at: string
          source: string
          status: string
          tags?: string[]
        }
      }
    }
  }
} 