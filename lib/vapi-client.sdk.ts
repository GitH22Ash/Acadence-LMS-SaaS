import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

/**
 * Returns the Vapi SDK singleton.
 * Only available in browser context — returns null on the server.
 */
export function getVapiClient(): Vapi | null {
  if (typeof window === "undefined") return null;

  if (!vapiInstance) {
    const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
    if (!token) {
      console.error("NEXT_PUBLIC_VAPI_WEB_TOKEN is not configured");
      return null;
    }
    vapiInstance = new Vapi(token);
  }

  return vapiInstance;
}