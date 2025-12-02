"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { getOrderByID } from "@/app/billing/orders"; 
import type { Order } from "@/app/billing/orders"; 

const shop_name = "CS & Hope Services";
const shop_address = "Washington Plaza, Kingston";
const gct_rate = 0.15;

type Item ={
  name: string;
  price: number;
  quantity: number;
};

type CartItem = Item &{
  discount: number;
  discountedPrice: number;
  totalLine: number;
};

export default function BillingPage(){
    const searchParams = useSearchParams(); // Get URL search parameters
    const orderID = searchParams.get("orderID") || "UNKNOWN"; // Retrieves the orderID from URL, defaults to "UNKNOWN"

    const [orderItems, setOrderItems] = useState<Item[]>([]); // State to hold the items in the order
    const [cartCalculation, setCartCalculation] = useState<CartItem[]>([]); // State for calculated cart items(price * quantity)
    const [totals, setTotals] = useState({ subtotal: 0, gct: 0, grandTotal: 0 }); // State for subtotal, tax, and total

    const [stage, setStage] = useState<"bill" | "payment" | "receipt">("bill"); // State to track the current stage of billing
    const [paymentType, setPaymentType] = useState<"" | "cash" | "debit" | "credit">(""); // State for selected payment type
    const [cardData, setCardData] = useState({ number: "", expiry: "", cvv: "" }); // State to hold card information
    const [receiptText, setReceiptText] = useState(""); // State to hold the generated receipt text
    const [receiptUser, setReceiptUser] = useState({ userId: "", displayName: "" }); // State to hold person who made order
    const [order, setOrder] = useState<Order | null>(null); // State to hold order

    useEffect(() => {
        if (!order) return; //
        const items: Item[] = order.OrderContents.map((oi) => ({
            name: oi.name,
            price: oi.priceAtPurchase,
            quantity: oi.quantity,
    }));
    setOrderItems(items);

    // Store user info for receipt
    setReceiptUser({ userId: order.userId, displayName: order.displayName });
    }, [order]);

    useEffect(() => {
        const fetchOrder = async () => {
        const data = await getOrderByID(orderID);
        if (data) setOrder(data);
        };
        fetchOrder();
    }, [orderID]);

    // Calculate totals whenever orderItems change
    useEffect(() =>{
        const calculation = orderItems.map((item) =>{
        const discount = item.quantity >= 3 ? item.price * 0.1 : 0; // Applies 10% discount if quantity >= 3
        const discountedPrice = item.price - discount; // Calculates the price after discount
        const totalLine = discountedPrice * item.quantity; // Total price for this line item
        return{ ...item, discount, discountedPrice, totalLine }; // Returns item with new calculated fields
        });

        const subtotal = calculation.reduce((sum, i) => sum + i.totalLine, 0); ;// Sum all the line totals to get the subtotal
        const gct = subtotal * gct_rate; // Calculates GCT(tax) based on subtotal
        const grandTotal = subtotal + gct; // Total including GCT

        setCartCalculation(calculation); // Updates state with the calculated cart items 
        setTotals({ subtotal, gct, grandTotal }); // Updates state with the calculated totals
    }, [orderItems]);

    const validateCard =() =>{
        if(!/^\d{16}$/.test(cardData.number)) return false; // Checks if card number is exactly 16 digits
        if(!/^\d{3}$/.test(cardData.cvv)) return false; // Checks if CVV is exactly 3 digits
        if(!/^\d{2}\/\d{2}$/.test(cardData.expiry)) return false; // Checks if expiry is in MM/YY format
        return true;
    };

    const tokenizeCard =() => "tok_" + Math.random().toString(36).substring(2, 12); // Generate a pseudo-random token for the card to meet PCI safety standards

    const processPayment = async() =>{
        if(paymentType === "cash"){
        generateReceipt(); // If paying by cash, skips card validation and generates the receipt
        return;
        }

        if(!validateCard()){
        alert("Invalid card info!"); // Alerts user that card info is invalid
        return;
        }

        if(cardData.number.startsWith("0")){
        alert("Card declined!"); // Simulate card decline 
        setStage("bill"); // Reset stage back to billing
        setPaymentType(""); // Reset selected payment type
        return;
        }

        if (paymentType === "debit" || paymentType === "credit") {
            const token = tokenizeCard();
            console.log("Card token stored:", token);

        // Save token to Firestore
        await setDoc(doc(collection(db, "cardTokens")), {
            token,
            orderID: order?.OrderID || "UNKNOWN",
            userId: order?.userId || "UNKNOWN",
            timestamp: new Date(),
        });

        generateReceipt();
        }
    };

    const generateReceipt = () => {
    const timestamp = new Date().toLocaleString();
    let receipt = `${shop_name}\n${shop_address}\nORDER ID: ${order?.OrderID || "UNKNOWN"}\nDATE: ${timestamp}\n`;
    receipt += `Customer: ${receiptUser.displayName} (${receiptUser.userId})\n`;
    receipt += `-----------------------------------------\n`;

    cartCalculation.forEach((i) => {
    receipt += `${i.name} 
QTY ${i.quantity} @ $${i.discountedPrice.toFixed(2)} each\t\t$${i.totalLine.toFixed(2)}\n\n`;
  });

  receipt += `-----------------------------------------
SUBTOTAL: $${totals.subtotal.toFixed(2)}
GCT(15%): $${totals.gct.toFixed(2)}
GRAND TOTAL: $${totals.grandTotal.toFixed(2)}
-----------------------------------------
THANK YOU FOR SHOPPING WITH US!\n`;

  setReceiptText(receipt);
  setStage("receipt");
};

  const downloadReceipt =() =>{
    const blob = new Blob([receiptText],{ type: "text/plain" }); // Creates a text blob from the receipt
    const url = URL.createObjectURL(blob); // Generates a temporary URL for the blob
    const a = document.createElement("a"); // Creates a temporary anchor element
    a.href = url;
    a.download = `receipt_${orderID}.txt` // Set the filename to receipt_orderid for uniqueness
    a.click();
    URL.revokeObjectURL(url);
  };

  return(
  <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

     {/* ---------- BILL ---------- */}
     {stage === "bill" &&(
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Bill Summary</h1>

          <div className="space-y-4">
           {cartCalculation.map((item, idx) =>(
              <div
                key={idx}
                className="border-b pb-3 flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    QTY{item.quantity} @ ${item.discountedPrice.toFixed(2)} each
                  </p>
                </div>
                <p className="font-bold text-gray-900">${item.totalLine.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-1 text-right text-gray-700">
            <p>Subtotal: <span className="font-semibold">${totals.subtotal.toFixed(2)}</span></p>
            <p>GCT(15%): <span className="font-semibold">${totals.gct.toFixed(2)}</span></p>
            <p className="text-xl font-bold text-gray-900">Total: ${totals.grandTotal.toFixed(2)}</p>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setStage("payment")}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
            >
              Continue to Payment
            </button>
            <button
              onClick={() =>(window.location.href = "/customer/home")}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

     {/* ---------- PAYMENT ---------- */}
     {stage === "payment" &&(
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Select Payment Method</h1>

         {!paymentType &&(
            <div className="space-y-4">
              <button
                onClick={generateReceipt}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
              >
                Cash on Delivery
              </button>
              <button
                onClick={() => setPaymentType("debit")}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Debit Card
              </button>
              <button
                onClick={() => setPaymentType("credit")}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Credit Card
              </button>
            </div>
          )}

         {(paymentType === "debit" || paymentType === "credit") &&(
            <form
              onSubmit={(e: FormEvent) =>{
                e.preventDefault();
                processPayment();
              }}
              className="mt-6 space-y-4"
            >
              <input
                placeholder="Card Number(16 digits)"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={16}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={5}
                />
                <input
                  placeholder="CVV"
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
              >
                Submit Payment
              </button>
            </form>
          )}
        </div>
      )}

     {/* ---------- RECEIPT ---------- */}
     {stage === "receipt" &&(
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Receipt</h1>

          <pre className="bg-gray-100 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
           {receiptText}
          </pre>

          <div className="mt-6 flex gap-4">
            <button
              onClick={downloadReceipt}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
            >
              Download Receipt
            </button>
            <button onClick={() =>(window.location.href = "/customer/home")}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition"
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