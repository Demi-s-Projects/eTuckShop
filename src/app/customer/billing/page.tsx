/**
 * Customer Billing Page
 * 
 * Handles payment processing and receipt generation for customer orders.
 * Customers are redirected here after placing an order from the cart.
 * 
 * Features:
 * - Bill summary with item details and totals
 * - Multiple payment methods (cash, debit, credit)
 * - Card tokenization for secure storage (PCI compliance)
 * - Receipt generation and download as .txt file
 * - GCT (15%) tax calculation
 * - Bulk discount (10% off when quantity >= 3)
 */

"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import { doc, setDoc, collection } from "firebase/firestore";
import styles from "@/styles/Billing.module.css";

// Shop configuration
const SHOP_NAME = "eTuckShop";
const SHOP_ADDRESS = "Washington Plaza, Kingston";
const GCT_RATE = 0.15;

/** Order type matching the API response */
type Order = {
    OrderID: number;
    userId: string;
    displayName: string;
    OrderTime: string;
    OrderContents: OrderItem[];
    TotalPrice: number;
    status: string;
};

/** Order item from API (uses priceAtPurchase) */
type OrderItem = {
    itemId: string;
    name: string;
    quantity: number;
    priceAtPurchase: number;
};

/** Internal item type for calculations */
type BillItem = {
    name: string;
    price: number;
    quantity: number;
};

/** Calculated item with discounts */
type CalculatedItem = BillItem & {
    discount: number;
    discountedPrice: number;
    totalLine: number;
};

/**
 * Fetches an order by ID from the API
 */
async function getOrderByID(id: string): Promise<Order | null> {
    try {
        const res = await fetch(`/api/orders?orderId=${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json.order as Order;
    } catch {
        return null;
    }
}

/**
 * Main billing content component
 * Separated to allow Suspense boundary for useSearchParams
 */
function BillingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderID = searchParams.get("orderID") || "";

    // Order and item state
    const [order, setOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<BillItem[]>([]);
    const [cartCalculation, setCartCalculation] = useState<CalculatedItem[]>([]);
    const [totals, setTotals] = useState({ subtotal: 0, gct: 0, grandTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Payment flow state
    const [stage, setStage] = useState<"bill" | "payment" | "receipt">("bill");
    const [paymentType, setPaymentType] = useState<"" | "cash" | "debit" | "credit">("");
    const [cardData, setCardData] = useState({ number: "", expiry: "", cvv: "" });
    const [receiptText, setReceiptText] = useState("");
    const [processing, setProcessing] = useState(false);

    // Fetch order on mount
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderID) {
                setError("No order ID provided");
                setLoading(false);
                return;
            }

            const data = await getOrderByID(orderID);
            if (data) {
                setOrder(data);
                // Map OrderContents to BillItems (convert priceAtPurchase to price)
                const items: BillItem[] = data.OrderContents.map((oi) => ({
                    name: oi.name,
                    price: oi.priceAtPurchase,
                    quantity: oi.quantity,
                }));
                setOrderItems(items);
            } else {
                setError("Order not found");
            }
            setLoading(false);
        };

        fetchOrder();
    }, [orderID]);

    // Calculate totals whenever orderItems change
    useEffect(() => {
        const calculation = orderItems.map((item) => {
            // Apply 10% discount if quantity >= 3
            const discount = item.quantity >= 3 ? item.price * 0.1 : 0;
            const discountedPrice = item.price - discount;
            const totalLine = discountedPrice * item.quantity;
            return { ...item, discount, discountedPrice, totalLine };
        });

        const subtotal = calculation.reduce((sum, i) => sum + i.totalLine, 0);
        const gct = subtotal * GCT_RATE;
        const grandTotal = subtotal + gct;

        setCartCalculation(calculation);
        setTotals({ subtotal, gct, grandTotal });
    }, [orderItems]);

    /**
     * Validates card information
     */
    const validateCard = (): boolean => {
        if (!/^\d{16}$/.test(cardData.number)) return false;
        if (!/^\d{3}$/.test(cardData.cvv)) return false;
        if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) return false;
        return true;
    };

    /**
     * Generates a pseudo-random token for card storage (PCI compliance)
     */
    const tokenizeCard = (): string => {
        return "tok_" + Math.random().toString(36).substring(2, 12);
    };

    /**
     * Processes the payment based on selected method
     */
    const processPayment = async () => {
        setProcessing(true);

        if (paymentType === "cash") {
            generateReceipt();
            setProcessing(false);
            return;
        }

        if (!validateCard()) {
            alert("Invalid card information. Please check your details.");
            setProcessing(false);
            return;
        }

        // Simulate card decline for cards starting with 0
        if (cardData.number.startsWith("0")) {
            alert("Card declined. Please try a different card.");
            setStage("bill");
            setPaymentType("");
            setCardData({ number: "", expiry: "", cvv: "" });
            setProcessing(false);
            return;
        }

        // Tokenize and store card for debit/credit
        if (paymentType === "debit" || paymentType === "credit") {
            try {
                const token = tokenizeCard();
                
                // Store token in Firestore cardTokens collection
                await setDoc(doc(collection(db, "cardTokens")), {
                    token,
                    cardType: paymentType,
                    lastFourDigits: cardData.number.slice(-4),
                    orderID: order?.OrderID || "UNKNOWN",
                    userId: order?.userId || "UNKNOWN",
                    timestamp: new Date(),
                });

                console.log("Card token stored:", token);
                generateReceipt();
            } catch (err) {
                console.error("Error storing card token:", err);
                alert("Payment processing failed. Please try again.");
            }
        }

        setProcessing(false);
    };

    /**
     * Generates the receipt text
     */
    const generateReceipt = () => {
        const timestamp = new Date().toLocaleString();
        let receipt = "";
        
        receipt += `${"=".repeat(45)}\n`;
        receipt += `${SHOP_NAME.toUpperCase()}\n`;
        receipt += `${SHOP_ADDRESS}\n`;
        receipt += `${"=".repeat(45)}\n\n`;
        
        receipt += `ORDER #: ${order?.OrderID || "UNKNOWN"}\n`;
        receipt += `DATE: ${timestamp}\n`;
        receipt += `CUSTOMER: ${order?.displayName || "Guest"}\n`;
        receipt += `PAYMENT: ${paymentType === "cash" ? "Cash on Arrival" : paymentType.toUpperCase() + " Card"}\n`;
        receipt += `${"-".repeat(45)}\n\n`;

        receipt += `ITEMS:\n`;
        cartCalculation.forEach((item) => {
            receipt += `${item.name}\n`;
            receipt += `  ${item.quantity} x $${item.discountedPrice.toFixed(2)}`;
            if (item.discount > 0) {
                receipt += ` (10% bulk discount)`;
            }
            receipt += `\n`;
            receipt += `  Subtotal: $${item.totalLine.toFixed(2)}\n\n`;
        });

        receipt += `${"-".repeat(45)}\n`;
        receipt += `SUBTOTAL:    $${totals.subtotal.toFixed(2)}\n`;
        receipt += `GCT (15%):   $${totals.gct.toFixed(2)}\n`;
        receipt += `${"-".repeat(45)}\n`;
        receipt += `GRAND TOTAL: $${totals.grandTotal.toFixed(2)}\n`;
        receipt += `${"=".repeat(45)}\n\n`;
        receipt += `Thank you for shopping with us!\n`;
        receipt += `Please keep this receipt for your records.\n`;

        setReceiptText(receipt);
        setStage("receipt");
    };

    /**
     * Downloads the receipt as a .txt file
     */
    const downloadReceipt = () => {
        const blob = new Blob([receiptText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt_order_${order?.OrderID || orderID}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Loading state
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.section}>
                        <h1 className={styles.title}>Loading...</h1>
                        <p>Fetching your order details...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.section}>
                        <h1 className={styles.title}>Error</h1>
                        <p>{error}</p>
                        <button 
                            onClick={() => router.push("/customer/home")} 
                            className={`${styles.button} ${styles["button-red"]}`}
                            style={{ marginTop: "1rem" }}
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* BILL SUMMARY STAGE */}
                {stage === "bill" && (
                    <div className={styles.section}>
                        <h1 className={styles.title}>Bill Summary</h1>
                        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                            Order #{order?.OrderID}
                        </p>
                        
                        <div className={styles.itemsList}>
                            {cartCalculation.map((item, idx) => (
                                <div key={idx} className={styles.billItem}>
                                    <div>
                                        <p className={styles.billItemName}>{item.name}</p>
                                        <p className={styles.billItemQty}>
                                            {item.quantity} × ${item.discountedPrice.toFixed(2)} each
                                            {item.discount > 0 && (
                                                <span style={{ color: "#16a34a", marginLeft: "0.5rem" }}>
                                                    (10% off)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <p className={styles.billItemTotal}>${item.totalLine.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        <div className={styles.totals}>
                            <p>Subtotal: <span className={styles.totalAmount}>${totals.subtotal.toFixed(2)}</span></p>
                            <p>GCT (15%): <span className={styles.totalAmount}>${totals.gct.toFixed(2)}</span></p>
                            <p className={styles.totalAmount} style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>
                                Total: ${totals.grandTotal.toFixed(2)}
                            </p>
                        </div>

                        <div className={styles.buttonGroup}>
                            <button 
                                onClick={() => setStage("payment")} 
                                className={`${styles.button} ${styles["button-green"]}`}
                            >
                                Continue to Payment
                            </button>
                            <button 
                                onClick={() => router.push("/customer/home")} 
                                className={`${styles.button} ${styles["button-red"]}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* PAYMENT STAGE */}
                {stage === "payment" && (
                    <div className={styles.section}>
                        <h1 className={styles.title}>Payment Method</h1>
                        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
                            Total: ${totals.grandTotal.toFixed(2)}
                        </p>

                        {!paymentType && (
                            <div className={styles.paymentOptions}>
                                <button 
                                    onClick={() => { setPaymentType("cash"); }}
                                    className={`${styles.button} ${styles["button-green"]}`}
                                >
                                    💵 Cash on Arrival
                                </button>
                                <button 
                                    onClick={() => setPaymentType("debit")} 
                                    className={`${styles.button} ${styles["button-gray"]}`}
                                >
                                    💳 Debit Card
                                </button>
                                <button 
                                    onClick={() => setPaymentType("credit")} 
                                    className={`${styles.button} ${styles["button-gray"]}`}
                                >
                                    💳 Credit Card
                                </button>
                                <button 
                                    onClick={() => setStage("bill")} 
                                    className={`${styles.button} ${styles["button-red"]}`}
                                    style={{ marginTop: "1rem" }}
                                >
                                    ← Back to Bill
                                </button>
                            </div>
                        )}

                        {paymentType === "cash" && (
                            <div className={styles.cashConfirm}>
                                <p style={{ marginBottom: "1rem" }}>
                                    You&apos;ve selected <strong>Cash on Arrival</strong>.
                                </p>
                                <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                                    Please have ${totals.grandTotal.toFixed(2)} ready when collecting your order.
                                </p>
                                <div className={styles.buttonGroup}>
                                    <button 
                                        onClick={processPayment}
                                        disabled={processing}
                                        className={`${styles.button} ${styles["button-green"]}`}
                                    >
                                        {processing ? "Processing..." : "Confirm & Get Receipt"}
                                    </button>
                                    <button 
                                        onClick={() => setPaymentType("")}
                                        className={`${styles.button} ${styles["button-gray"]}`}
                                    >
                                        Choose Different Method
                                    </button>
                                </div>
                            </div>
                        )}

                        {(paymentType === "debit" || paymentType === "credit") && (
                            <form
                                onSubmit={(e: FormEvent) => { e.preventDefault(); processPayment(); }}
                                className={styles.cardForm}
                            >
                                <p style={{ marginBottom: "1rem", fontWeight: 600 }}>
                                    {paymentType === "debit" ? "Debit" : "Credit"} Card Details
                                </p>
                                <input 
                                    type="text"
                                    placeholder="Card Number (16 digits)" 
                                    value={cardData.number} 
                                    onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, "") })} 
                                    className={styles.input} 
                                    maxLength={16}
                                    required
                                />
                                <div className={styles["grid-2"]}>
                                    <input 
                                        type="text"
                                        placeholder="MM/YY" 
                                        value={cardData.expiry} 
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, "");
                                            if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                                            setCardData({ ...cardData, expiry: val });
                                        }} 
                                        className={styles.input} 
                                        maxLength={5}
                                        required
                                    />
                                    <input 
                                        type="text"
                                        placeholder="CVV" 
                                        value={cardData.cvv} 
                                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "") })} 
                                        className={styles.input} 
                                        maxLength={3}
                                        required
                                    />
                                </div>
                                <div className={styles.buttonGroup}>
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className={`${styles.button} ${styles["button-green"]}`}
                                    >
                                        {processing ? "Processing..." : `Pay $${totals.grandTotal.toFixed(2)}`}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setPaymentType("");
                                            setCardData({ number: "", expiry: "", cvv: "" });
                                        }}
                                        className={`${styles.button} ${styles["button-gray"]}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* RECEIPT STAGE */}
                {stage === "receipt" && (
                    <div className={styles.section}>
                        <h1 className={styles.title}>🎉 Order Complete!</h1>
                        <p style={{ color: "#16a34a", marginBottom: "1rem", fontWeight: 600 }}>
                            Your payment has been processed successfully.
                        </p>
                        
                        <pre className={styles.receipt}>{receiptText}</pre>
                        
                        <div className={styles.buttonGroup}>
                            <button 
                                onClick={downloadReceipt} 
                                className={`${styles.button} ${styles["button-green"]}`}
                            >
                                📥 Download Receipt (.txt)
                            </button>
                            <button 
                                onClick={() => router.push("/customer/home")} 
                                className={`${styles.button} ${styles["button-gray"]}`}
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Billing page with Suspense wrapper for useSearchParams
 */
export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.section}>
                        <h1 className={styles.title}>Loading...</h1>
                    </div>
                </div>
            </div>
        }>
            <BillingContent />
        </Suspense>
    );
}
