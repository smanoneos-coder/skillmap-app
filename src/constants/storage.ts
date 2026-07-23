export const NODE_IMAGE_BUCKET_ENV = "SUPABASE_NODE_IMAGE_BUCKET";
export const DEFAULT_NODE_IMAGE_BUCKET = "node-images";

export function getNodeImageBucket() {
  return process.env[NODE_IMAGE_BUCKET_ENV]?.trim() || DEFAULT_NODE_IMAGE_BUCKET;
}
