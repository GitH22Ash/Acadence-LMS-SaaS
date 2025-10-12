import Vapi from "@vapi-ai/web";

let vapi: Vapi | null = null;

if (typeof window !== "undefined") {
  vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
}

export const vapiSDK = vapi;