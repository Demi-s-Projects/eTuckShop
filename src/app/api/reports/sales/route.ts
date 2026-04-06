import { NextResponse } from "next/server";
import { Container } from "@/di/container";

const container = Container.getInstance();

export async function GET(req: Request) {
  try {
    const auth = await container.authVerifier.verify(req);
    if (!auth.ok) {
      return new NextResponse(JSON.stringify({ error: auth.error }), { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const result = await container.reportApplicationService.generateSalesReport(auth.user, {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      timeZone: searchParams.get("timeZone"),
    });

    if (!result.ok) {
      return new NextResponse(JSON.stringify({ error: result.error }), { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("Sales report error:", err);
    return new NextResponse(JSON.stringify({ error: "Failed to generate report" }), { status: 500 });
  }
}
