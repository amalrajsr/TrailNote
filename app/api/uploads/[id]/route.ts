import { getDatabase } from "../../../../src/db";
import { requireViewer } from "../../../../src/server/auth";
import { DomainError } from "../../../../src/server/result";
import {
  assertSameOrigin,
  privateHeaders,
} from "../../../../src/server/security";
import { cancelUpload } from "../../../../src/server/services/uploads";

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/uploads/[id]">,
) {
  try {
    assertSameOrigin(request);
    const user = await requireViewer();
    const { id } = await context.params;
    const { db } = await getDatabase();
    await cancelUpload(db, user.id, id);
    return new Response(null, { status: 204, headers: privateHeaders() });
  } catch (error) {
    const domain = error instanceof DomainError ? error : null;
    return Response.json(
      {
        code: domain?.code ?? "INTERNAL",
        message: domain?.message ?? "Could not remove photo.",
      },
      {
        status: domain?.code === "UNAUTHENTICATED" ? 401 : 400,
        headers: privateHeaders(),
      },
    );
  }
}
