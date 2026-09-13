import { getAuth } from "../../../../src/server/auth";
import { redirect } from "next/navigation";

async function handle(request: Request) {
  try {
    return await (await getAuth()).handler(request);
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_BLOCKED")
      return redirect("/sign-in?error=blocked");
    if (new URL(request.url).pathname.endsWith("/callback/google"))
      return redirect("/sign-in?error=oauth");
    throw error;
  }
}
export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
