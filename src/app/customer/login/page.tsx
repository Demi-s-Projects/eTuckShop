import Link from "next/link";

export default function CustomerLogin() {
    return (
        <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8, background: "var(--background)" }}>
            <h1 style={{ marginBottom: 24 }}>Login</h1>
            <form>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="email" style={{ display: "block", marginBottom: 8 }}>Email</label>
                    <input type="email" id="email" name="email" required style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label htmlFor="password" style={{ display: "block", marginBottom: 8 }}>Password</label>
                    <input type="password" id="password" name="password" required style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                </div>
                <button type="submit" style={{ width: "100%", padding: 10, background: "#171717", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Login</button>
            </form>
            <div style={{ marginTop: 16, textAlign: "center" }}>
                <Link href="/customer/register">Don&apos;t have an account? Sign Up</Link>
            </div>
        </div>
    );
}