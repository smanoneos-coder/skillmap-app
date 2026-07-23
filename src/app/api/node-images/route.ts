import { NextResponse } from "next/server";

import { getNodeImageBucket } from "@/constants/storage";
import type { ApiErrorCode } from "@/lib/api-errors";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return applyCookies(apiErrorResponse("UNAUTHORIZED", "Login is required.", 401));
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return applyCookies(apiErrorResponse("BAD_REQUEST", "Image file is required.", 400));
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return applyCookies(
      apiErrorResponse("BAD_REQUEST", "Only jpeg, png, webp, and gif images are supported.", 400),
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return applyCookies(apiErrorResponse("BAD_REQUEST", "Image must be 5MB or smaller.", 400));
  }

  const extension = getImageExtension(file);
  const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const bucket = getNodeImageBucket();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    const uploadFailure = getUploadFailure(uploadError);

    console.error("Node image upload failed.", {
      message: uploadError.message.slice(0, 160),
      name: uploadError.name,
      statusCode: uploadFailure.status,
    });

    return applyCookies(apiErrorResponse(uploadFailure.code, uploadFailure.message, uploadFailure.status));
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return applyCookies(
    NextResponse.json({
      data: {
        imageUrl: publicUrl,
        path: objectPath,
      },
    }),
  );
}

function apiErrorResponse(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function getUploadFailure(error: { message: string; name: string }) {
  const message = error.message.toLowerCase();

  if (message.includes("bucket not found") || message.includes("not found")) {
    return {
      code: "NOT_FOUND" as const,
      message: "Storage bucket was not found. Create the node-images bucket in Supabase Storage.",
      status: 404,
    };
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  ) {
    return {
      code: "UNAUTHORIZED" as const,
      message: "Storage policy blocked the upload. Add the node-images upload policy in Supabase.",
      status: 403,
    };
  }

  if (message.includes("mime") || message.includes("content type")) {
    return {
      code: "BAD_REQUEST" as const,
      message: "This image type is not allowed by the Storage bucket.",
      status: 400,
    };
  }

  return {
    code: "INTERNAL_ERROR" as const,
    message: "Image upload failed. Check the Supabase Storage bucket and policies.",
    status: 500,
  };
}

function getImageExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}
