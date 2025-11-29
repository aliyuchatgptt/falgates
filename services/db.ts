import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StaffMember, CheckInLog, StaffImage, ImageAngleType } from '../types';

// Supabase configuration
const SUPABASE_URL = 'https://zynxqtboqwciuabblsqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bnhxdGJvcXdjaXVhYmJsc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY1ODEsImV4cCI6MjA3OTkyMjU4MX0.5GhRESWXxZYyIXjNyl0-LenDinDlJf7E4Z22bBbeFRs';

// Database row types (snake_case as stored in Supabase)
interface StaffRow {
  id: string;
  full_name: string;
  assigned_unit: string;
  registered_at: number;
  face_embedding: number[];
  reference_image_base64: string;
  face_token?: string;
}

interface CheckInRow {
  id?: number;
  staff_id: string;
  staff_name: string;
  assigned_unit: string;
  timestamp: number;
  confidence_score: number;
}

interface StaffImageRow {
  id?: number;
  staff_id: string;
  image_base64: string;
  angle_type: string;
  created_at?: number;
}

// Convert between app types (camelCase) and database types (snake_case)
function staffRowToMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    fullName: row.full_name,
    assignedUnit: row.assigned_unit as StaffMember['assignedUnit'],
    registeredAt: row.registered_at,
    faceEmbedding: row.face_embedding,
    referenceImageBase64: row.reference_image_base64,
    faceToken: row.face_token,
  };
}

function staffMemberToRow(member: StaffMember): StaffRow {
  const row: StaffRow = {
    id: member.id,
    full_name: member.fullName,
    assigned_unit: member.assignedUnit,
    registered_at: member.registeredAt,
    face_embedding: member.faceEmbedding,
    reference_image_base64: member.referenceImageBase64,
  };
  if (member.faceToken) {
    row.face_token = member.faceToken;
  }
  return row;
}

function checkInRowToLog(row: CheckInRow): CheckInLog {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    assignedUnit: row.assigned_unit as CheckInLog['assignedUnit'],
    timestamp: row.timestamp,
    confidenceScore: row.confidence_score,
  };
}

function checkInLogToRow(log: CheckInLog): Omit<CheckInRow, 'id'> {
  return {
    staff_id: log.staffId,
    staff_name: log.staffName,
    assigned_unit: log.assignedUnit,
    timestamp: log.timestamp,
    confidence_score: log.confidenceScore,
  };
}

function staffImageRowToImage(row: StaffImageRow): StaffImage {
  return {
    id: row.id,
    staffId: row.staff_id,
    imageBase64: row.image_base64,
    angleType: row.angle_type as ImageAngleType,
    createdAt: row.created_at,
  };
}

function staffImageToRow(image: StaffImage): Omit<StaffImageRow, 'id' | 'created_at'> {
  return {
    staff_id: image.staffId,
    image_base64: image.imageBase64,
    angle_type: image.angleType,
  };
}

class SupabaseDatabase {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async connect(): Promise<void> {
    // Supabase client is ready immediately, no connection needed
    // This method is kept for API compatibility
  }

  async addStaff(staff: StaffMember): Promise<void> {
    const row = staffMemberToRow(staff);
    const { error } = await this.supabase.from('staff').insert(row);
    
    if (error) {
      throw new Error(`Error adding staff: ${error.message}`);
    }
  }

  async getAllStaff(): Promise<StaffMember[]> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('*')
      .order('registered_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching staff: ${error.message}`);
    }
    
    return (data as StaffRow[]).map(staffRowToMember);
  }

  async deleteStaff(id: string): Promise<void> {
    const { error } = await this.supabase.from('staff').delete().eq('id', id);
    
    if (error) {
      throw new Error(`Error deleting staff: ${error.message}`);
    }
  }

  async getStaffById(id: string): Promise<StaffMember | null> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error fetching staff: ${error.message}`);
    }
    
    return data ? staffRowToMember(data as StaffRow) : null;
  }

  async updateStaffFaceToken(id: string, faceToken: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff')
      .update({ face_token: faceToken })
      .eq('id', id);
    
    if (error) {
      throw new Error(`Error updating face token: ${error.message}`);
    }
  }

  async getNextId(): Promise<string> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('id')
      .order('id', { ascending: false });
    
    if (error) {
      throw new Error(`Error generating ID: ${error.message}`);
    }
    
    if (!data || data.length === 0) return 'FG0001';

    const maxNum = data.reduce((max: number, s: { id: string }) => {
      const numStr = s.id.replace(/[^0-9]/g, '');
      const num = parseInt(numStr, 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    const nextNum = maxNum + 1;
    return `FG${nextNum.toString().padStart(4, '0')}`;
  }

  // --- Check-In Logging Methods ---

  async logCheckIn(log: CheckInLog): Promise<void> {
    const row = checkInLogToRow(log);
    const { error } = await this.supabase.from('check_ins').insert(row);
    
    if (error) {
      throw new Error(`Error logging check-in: ${error.message}`);
    }
  }

  async getRecentCheckIns(limit: number = 50): Promise<CheckInLog[]> {
    const { data, error } = await this.supabase
      .from('check_ins')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Error fetching check-ins: ${error.message}`);
    }
    
    return (data as CheckInRow[]).map(checkInRowToLog);
  }

  async clearAllData(): Promise<void> {
    // Delete check_ins first due to foreign key constraint
    const { error: checkInsError } = await this.supabase.from('check_ins').delete().neq('id', 0);
    if (checkInsError) {
      throw new Error(`Error clearing check-ins: ${checkInsError.message}`);
    }
    
    const { error: staffError } = await this.supabase.from('staff').delete().neq('id', '');
    if (staffError) {
      throw new Error(`Error clearing staff: ${staffError.message}`);
    }
  }

  async exportAllData(): Promise<void> {
    const staff = await this.getAllStaff();
    
    const { data: checkInsData, error } = await this.supabase
      .from('check_ins')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching check-ins for export: ${error.message}`);
    }
    
    const checkIns = (checkInsData as CheckInRow[]).map(checkInRowToLog);

    const exportData = {
      timestamp: Date.now(),
      staff,
      checkIns
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `falgates_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Settings Methods ---

  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) {
      // PGRST116 means no rows found, which is not an error for us
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error fetching setting: ${error.message}`);
    }
    
    return data?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const { error } = await this.supabase
      .from('settings')
      .upsert({
        key,
        value,
        updated_at: Date.now()
      }, { onConflict: 'key' });
    
    if (error) {
      throw new Error(`Error saving setting: ${error.message}`);
    }
  }

  async deleteSetting(key: string): Promise<void> {
    const { error } = await this.supabase
      .from('settings')
      .delete()
      .eq('key', key);
    
    if (error) {
      throw new Error(`Error deleting setting: ${error.message}`);
    }
  }

  // --- Staff Images Methods ---

  async addStaffImages(staffId: string, images: Omit<StaffImage, 'id' | 'staffId' | 'createdAt'>[]): Promise<void> {
    const rows = images.map(img => ({
      staff_id: staffId,
      image_base64: img.imageBase64,
      angle_type: img.angleType,
    }));

    const { error } = await this.supabase.from('staff_images').insert(rows);
    
    if (error) {
      throw new Error(`Error adding staff images: ${error.message}`);
    }
  }

  async getStaffImages(staffId: string): Promise<StaffImage[]> {
    const { data, error } = await this.supabase
      .from('staff_images')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Error fetching staff images: ${error.message}`);
    }
    
    return (data as StaffImageRow[]).map(staffImageRowToImage);
  }

  async deleteStaffImages(staffId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_images')
      .delete()
      .eq('staff_id', staffId);
    
    if (error) {
      throw new Error(`Error deleting staff images: ${error.message}`);
    }
  }
}

export const dbService = new SupabaseDatabase();
