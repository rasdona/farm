// ============================================================
// upload-photo: Upload and validate profile photo
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResp(data: Record<string, unknown>, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function errorResp(msg: string, status = 400, origin?: string | null) {
  return jsonResp({ error: msg }, status, origin);
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") return errorResp("Method not allowed", 405, origin);

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResp("Unauthorized", 401, origin);

    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return errorResp("Unauthorized", 401, origin);

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) return errorResp("No photo provided", 400, origin);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResp("Invalid file type. Only JPG, PNG, and WEBP are allowed.", 400, origin);
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return errorResp("File too large. Maximum size is 5MB.", 400, origin);
    }

    // Validate it's actually an image by reading first bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check magic bytes
    const isValidImage =
      // JPEG: FF D8 FF
      (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) ||
      // PNG: 89 50 4E 47
      (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) ||
      // WEBP: RIFF....WEBP
      (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
       bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50);

    if (!isValidImage) {
      return errorResp("File is not a valid image.", 400, origin);
    }

    // Get image dimensions from the file
    let width = 0;
    let height = 0;

    try {
      // Use createImageBitmap via Deno
      const blob = new Blob([arrayBuffer]);
      const bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // Fallback: try to read dimensions from headers
      if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        // PNG
        width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
        height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      }
    }

    // Validate dimensions
    if (width > 0 && width < MIN_WIDTH) {
      return errorResp(`Image too narrow. Minimum width is ${MIN_WIDTH}px.`, 400, origin);
    }
    if (height > 0 && height < MIN_HEIGHT) {
      return errorResp(`Image too short. Minimum height is ${MIN_HEIGHT}px.`, 400, origin);
    }

    // Upload to Supabase Storage
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${user.id}/profile.${ext}`;

    // Delete old photo first
    await sb.storage.from("profile-images").remove([`${user.id}/profile.jpg`, `${user.id}/profile.png`, `${user.id}/profile.webp`]);

    const { error: uploadErr } = await sb.storage
      .from("profile-images")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return errorResp("Failed to upload photo: " + uploadErr.message, 500, origin);
    }

    // Get public URL
    const { data: urlData } = sb.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    const photoUrl = urlData.publicUrl;

    // Save to database via function
    const { data: result, error: fnErr } = await sb.rpc("upload_profile_photo", {
      p_user_id: user.id,
      p_photo_url: photoUrl,
      p_file_name: file.name,
      p_file_size_bytes: file.size,
      p_file_type: file.type,
      p_width: width || null,
      p_height: height || null,
    });

    if (fnErr) {
      console.error("upload_profile_photo error:", fnErr);
      return errorResp("Failed to save photo record", 500, origin);
    }

    const r = result?.[0];

    return jsonResp({
      success: r?.success ?? true,
      message: r?.message ?? "Photo uploaded",
      photo_url: r?.photo_url ?? photoUrl,
      profile_complete: r?.profile_complete ?? false,
      width,
      height,
      file_size: file.size,
    }, 200, origin);

  } catch (err) {
    console.error("upload-photo error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
