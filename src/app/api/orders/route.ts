import type { CreateOrderRequest, UpdateOrderRequest } from "@/types/Order";
import { Container } from "@/di/container";

const container = Container.getInstance();

function serviceError(result: { error: string; status: number; details?: unknown }) {
  if (result.details !== undefined) {
    return Response.json(
      { error: result.error, details: result.details },
      { status: result.status }
    );
  }
  return Response.json({ error: result.error }, { status: result.status });
}

export async function GET(request: Request) {
  const auth = await container.authVerifier.verify(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await container.orderApplicationService.getOrders(auth.user, {
      orderId: searchParams.get("orderId"),
      userId: searchParams.get("userId"),
    });

    if (!result.ok) {
      return serviceError(result);
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    return Response.json({ error: "Failed to retrieve orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await container.authVerifier.verify(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as CreateOrderRequest;
    const result = await container.orderApplicationService.createOrder(auth.user, body);

    if (!result.ok) {
      return serviceError(result);
    }

    return Response.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    return Response.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await container.authVerifier.verify(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as UpdateOrderRequest;
    const result = await container.orderApplicationService.updateOrder(auth.user, body);

    if (!result.ok) {
      return serviceError(result);
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/orders:", error);
    return Response.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await container.authVerifier.verify(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await container.orderApplicationService.deleteOrder(auth.user, {
      orderId: searchParams.get("orderId"),
    });

    if (!result.ok) {
      return serviceError(result);
    }

    return Response.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/orders:", error);
    return Response.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
