import { verify } from "@/app/api/inventory/route";
import { Container } from "@/di/container";

const container = Container.getInstance();

type RouteParams = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { itemId } = await params;
  const authResult = await verify(request);

  if ("error" in authResult) {
    return Response.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await container.inventoryApplicationService.getOne(authResult.user, itemId);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return Response.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { itemId } = await params;
  const authResult = await verify(request);

  if ("error" in authResult) {
    return Response.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await container.inventoryApplicationService.update(authResult.user, itemId, body);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return Response.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { itemId } = await params;
  const authResult = await verify(request);

  if ("error" in authResult) {
    return Response.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await container.inventoryApplicationService.remove(authResult.user, itemId);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return Response.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
