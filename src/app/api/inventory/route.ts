import { Container } from "@/di/container";

const container = Container.getInstance();

export async function verify(request: Request) {
  const auth = await container.authVerifier.verify(request);
  if (!auth.ok) {
    return { error: auth.error, status: auth.status };
  }

  const userRole = auth.user.role;
  if (userRole !== "employee" && userRole !== "owner") {
    return {
      error: "Forbidden: Employee or Owner access required",
      status: 403,
    };
  }

  return { user: auth.user };
}

export async function GET(request: Request) {
  const authResult = await verify(request);

  if ("error" in authResult) {
    return Response.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await container.inventoryApplicationService.getAll(authResult.user);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return Response.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await verify(request);

  if ("error" in authResult) {
    return Response.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await container.inventoryApplicationService.create(authResult.user, body);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return Response.json({ error: "Failed to add item" }, { status: 500 });
  }
}
