import { adminAuth } from "@/firebase/admin";

export interface AuthenticatedUser {
  uid: string;
  role?: string;
  email?: string;
  name?: string;
}

export type AuthVerificationResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; error: string; status: number };

export class RequestAuthVerifier {
  async verify(request: Request): Promise<AuthVerificationResult> {
    try {
      const sessionToken = this.getSessionCookieToken(request);
      if (sessionToken) {
        const decoded = await adminAuth.verifySessionCookie(sessionToken, true);
        return {
          ok: true,
          user: {
            uid: decoded.uid,
            role: decoded.role as string | undefined,
            email: decoded.email,
            name: decoded.name,
          },
        };
      }

      const bearerToken = this.getBearerToken(request);
      if (bearerToken) {
        try {
          const decodedIdToken = await adminAuth.verifyIdToken(bearerToken, true);
          return {
            ok: true,
            user: {
              uid: decodedIdToken.uid,
              role: decodedIdToken.role as string | undefined,
              email: decodedIdToken.email,
              name: decodedIdToken.name,
            },
          };
        } catch {
          const decodedSession = await adminAuth.verifySessionCookie(bearerToken, true);
          return {
            ok: true,
            user: {
              uid: decodedSession.uid,
              role: decodedSession.role as string | undefined,
              email: decodedSession.email,
              name: decodedSession.name,
            },
          };
        }
      }

      return { ok: false, error: "Unauthorized", status: 401 };
    } catch (error) {
      console.error("Auth verification error:", error);
      return { ok: false, error: "Invalid session", status: 401 };
    }
  }

  private getSessionCookieToken(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith("session="));
    if (!sessionCookie) return null;

    return sessionCookie.split("=")[1] || null;
  }

  private getBearerToken(request: Request): string | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    return authHeader.split(" ")[1] || null;
  }
}
