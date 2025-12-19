"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  askingPrice: string | null;
  mileage: number | null;
  exteriorColor: string | null;
  stockNumber: string | null;
}

interface Dealership {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  brandColor: string | null;
}

interface FeeItem {
  id: string;
  description: string;
  amount: number;
}

interface TradeIn {
  year: string;
  make: string;
  model: string;
  bodyStyle: string;
  vin: string;
  licenseNo: string;
  odometer: string;
  color: string;
  lienholderName: string;
  lienholderAddress: string;
  lienholderPhone: string;
  payoff: number;
  payoffGoodThrough: string;
  approved: boolean;
}

interface BuyersOrderBuilderProps {
  lead: Lead;
  vehicle?: Vehicle | null;
  dealership: Dealership;
  documentId?: string;
  currentUserName?: string;
  onClose: () => void;
  onSaved?: (documentId: string) => void;
}

const emptyTradeIn: TradeIn = {
  year: "",
  make: "",
  model: "",
  bodyStyle: "",
  vin: "",
  licenseNo: "",
  odometer: "",
  color: "",
  lienholderName: "",
  lienholderAddress: "",
  lienholderPhone: "",
  payoff: 0,
  payoffGoodThrough: "",
  approved: false,
};

export function BuyersOrderBuilder({
  lead,
  vehicle,
  dealership,
  documentId,
  currentUserName,
  onClose,
  onSaved,
}: BuyersOrderBuilderProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"wizard" | "form">("wizard");
  const [wizardStep, setWizardStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"info" | "fees" | "terms" | "preview">("info");

  // Header Info
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [stockNo, setStockNo] = useState(vehicle?.stockNumber || "");
  const [appNo, setAppNo] = useState("");
  const [contractNo, setContractNo] = useState(`BO-${Date.now().toString(36).toUpperCase()}`);
  const [salesperson, setSalesperson] = useState(currentUserName || "");

  // Dealer Info (editable)
  const [llcName, setLlcName] = useState("");
  const [dealerDisplayName, setDealerDisplayName] = useState(dealership.name);
  const [dealerAddress, setDealerAddress] = useState(dealership.address || "");
  const [dealerCity, setDealerCity] = useState(dealership.city || "");
  const [dealerState, setDealerState] = useState(dealership.state || "");
  const [dealerZip, setDealerZip] = useState(dealership.zip || "");

  // Buyer Info
  const [buyerName, setBuyerName] = useState(
    [lead.firstName, lead.lastName].filter(Boolean).join(" ")
  );
  const [coBuyerName, setCoBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerCity, setBuyerCity] = useState(lead.city || "");
  const [buyerState, setBuyerState] = useState(lead.state || "");
  const [buyerZip, setBuyerZip] = useState(lead.zip || "");

  // Vehicle Info
  const [vehicleCondition, setVehicleCondition] = useState<"new" | "used" | "demo">("used");
  const [vehicleYear, setVehicleYear] = useState(vehicle?.year?.toString() || "");
  const [vehicleMake, setVehicleMake] = useState(vehicle?.make || "");
  const [vehicleModel, setVehicleModel] = useState(vehicle?.model || "");
  const [vehicleBodyStyle, setVehicleBodyStyle] = useState("");
  const [vehicleVin, setVehicleVin] = useState(vehicle?.vin || "");
  const [vehicleLicenseNo, setVehicleLicenseNo] = useState("");
  const [vehicleOdometer, setVehicleOdometer] = useState(vehicle?.mileage?.toString() || "");
  const [vehicleColor, setVehicleColor] = useState(vehicle?.exteriorColor || "");
  const [vehicleOther, setVehicleOther] = useState(vehicle?.trim || "");

  // Trade-In
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeIn, setTradeIn] = useState<TradeIn>(emptyTradeIn);

  // Itemization of Sale
  const [vehicleSalesPrice, setVehicleSalesPrice] = useState(
    vehicle?.askingPrice ? parseFloat(vehicle.askingPrice) : 0
  );
  const [salesTaxRate, setSalesTaxRate] = useState(0);

  // Title, License & Other Fees (lines 4-14)
  const [fees, setFees] = useState<FeeItem[]>([
    { id: "1", description: "Documentation Fee", amount: 0 },
    { id: "2", description: "Title Fee", amount: 0 },
    { id: "3", description: "License/Registration", amount: 0 },
    { id: "4", description: "Shipping/Delivery Fee", amount: 0 },
    { id: "5", description: "Emission Test Fee", amount: 0 },
    { id: "6", description: "", amount: 0 },
  ]);

  // Additional Products (lines 16-23)
  const [products, setProducts] = useState<FeeItem[]>([
    { id: "1", description: "", amount: 0 },
    { id: "2", description: "", amount: 0 },
    { id: "3", description: "", amount: 0 },
    { id: "4", description: "", amount: 0 },
  ]);

  // Down Payment
  const [tradeInAllowance, setTradeInAllowance] = useState(0);
  const [cashDownPayment, setCashDownPayment] = useState(0);
  const [deferredDownPayment, setDeferredDownPayment] = useState(0);

  // Warranty Options
  const [warranty30DayReturn, setWarranty30DayReturn] = useState(true);
  const [warranty90DayPowertrain, setWarranty90DayPowertrain] = useState(true);
  const [warranty90DayDrivetrain, setWarranty90DayDrivetrain] = useState(true);
  const [warrantyNotes, setWarrantyNotes] = useState("");

  // Signatures
  const [buyerSignature, setBuyerSignature] = useState("");
  const [coBuyerSignature, setCoBuyerSignature] = useState("");
  const [dealerSignature, setDealerSignature] = useState("");

  // Calculations
  const salesTax = vehicleSalesPrice * (salesTaxRate / 100);
  const subtotal = vehicleSalesPrice + salesTax;
  const totalFees = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalProducts = products.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashSalePrice = subtotal + totalFees + totalProducts;
  const lessPayoff = hasTradeIn ? tradeIn.payoff : 0;
  const netTradeAllowance = tradeInAllowance - lessPayoff;
  const totalDownPayment = netTradeAllowance + cashDownPayment + deferredDownPayment;
  const totalBalanceDue = cashSalePrice - totalDownPayment;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDealerFullName = () => {
    if (llcName && dealerDisplayName) {
      return `${llcName} DBA ${dealerDisplayName}`;
    }
    return llcName || dealerDisplayName;
  };

  // For HTML/PDF with styling
  const getDealerFullNameHTML = () => {
    if (llcName && dealerDisplayName) {
      return `<strong>${llcName}</strong> <span style="font-weight: normal;">DBA</span> <em>${dealerDisplayName}</em>`;
    }
    return `<strong>${llcName || dealerDisplayName}</strong>`;
  };

  const handleSignAndSend = async () => {
    if (!lead.primaryEmail) {
      alert("Customer email is required to send for signature");
      return;
    }
    setSending(true);
    try {
      // First save the document
      const saveResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          documentType: "buyers_order",
          vehicleId: vehicle?.id,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save document");
      }

      const { document } = await saveResponse.json();

      // Then update status to sent
      await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });

      onSaved?.(document.id);
      alert("Buyer's Order sent to customer for signature!");
    } catch (error) {
      console.error("Failed to send for signature:", error);
      alert("Failed to send for signature");
    } finally {
      setSending(false);
    }
  };

  const updateFee = (id: string, field: "description" | "amount", value: string | number) => {
    setFees(fees.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const updateProduct = (id: string, field: "description" | "amount", value: string | number) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addFee = () => {
    setFees([...fees, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };

  const addProduct = () => {
    setProducts([...products, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          documentType: "buyers_order",
          vehicleId: vehicle?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSaved?.(data.document.id);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save buyer's order");
      }
    } catch (error) {
      console.error("Failed to save buyer's order:", error);
      alert("Failed to save buyer's order");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const brandColor = dealership.brandColor || "#1e40af";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
      return;
    }

    const warrantySection = `
      <div class="warranty-section">
        <h3>Warranty Information</h3>
        ${warranty30DayReturn ? `
        <div class="warranty-item">
          <strong>30-Day Return Policy</strong>
          <ul>
            <li>30-day return window from the date of delivery</li>
            <li>Vehicle must be in original condition</li>
            <li>Maximum +500 miles added since delivery</li>
            <li>No accidents, damage, or modifications</li>
            <li>Inspection required to confirm condition</li>
          </ul>
        </div>
        ` : ""}
        ${warranty90DayPowertrain ? `
        <div class="warranty-item">
          <strong>90-Day Powertrain Warranty</strong>
          <p>Covers engine, transmission, and drivetrain components for 90 days from delivery.</p>
        </div>
        ` : ""}
        ${warranty90DayDrivetrain ? `
        <div class="warranty-item">
          <strong>90-Day Drivetrain Warranty</strong>
          <p>Covers drivetrain components for 90 days from delivery.</p>
        </div>
        ` : ""}
        ${warrantyNotes ? `<div class="warranty-notes"><strong>Additional Notes:</strong> ${warrantyNotes}</div>` : ""}
      </div>
    `;

    const tradeInSection = hasTradeIn ? `
      <div class="section trade-in">
        <h3>Trade-In Information</h3>
        <div class="trade-in-grid">
          <div class="field"><span class="label">Year:</span> ${tradeIn.year}</div>
          <div class="field"><span class="label">Make:</span> ${tradeIn.make}</div>
          <div class="field"><span class="label">Model:</span> ${tradeIn.model}</div>
          <div class="field"><span class="label">Body Style:</span> ${tradeIn.bodyStyle}</div>
          <div class="field"><span class="label">VIN:</span> ${tradeIn.vin}</div>
          <div class="field"><span class="label">License No:</span> ${tradeIn.licenseNo}</div>
          <div class="field"><span class="label">Odometer:</span> ${tradeIn.odometer}</div>
          <div class="field"><span class="label">Color:</span> ${tradeIn.color}</div>
        </div>
        ${tradeIn.lienholderName ? `
        <div class="lienholder">
          <h4>Lienholder Information</h4>
          <p>${tradeIn.lienholderName}</p>
          <p>${tradeIn.lienholderAddress}</p>
          <p>Phone: ${tradeIn.lienholderPhone}</p>
          <p>Payoff: ${formatCurrency(tradeIn.payoff)} (Good through: ${tradeIn.payoffGoodThrough})</p>
        </div>
        ` : ""}
      </div>
    ` : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Buyer's Order - ${contractNo}</title>
          <style>
            @page { size: A4; margin: 0.5in 0.6in; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 10px;
              line-height: 1.5;
              color: #111827;
              background: white;
            }
            .page {
              max-width: 8.27in;
              margin: 0 auto;
              padding: 0.4in 0.5in;
            }

            /* Header */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 12px;
              margin-bottom: 16px;
              border-bottom: 2px solid ${brandColor};
            }
            .header-left { }
            .header-title {
              font-size: 22px;
              font-weight: 700;
              color: ${brandColor};
              letter-spacing: -0.5px;
              margin-bottom: 6px;
            }
            .dealer-info { font-size: 10px; color: #374151; line-height: 1.4; }
            .dealer-info .name { font-weight: 600; font-size: 12px; margin-bottom: 2px; }
            .header-right { text-align: right; }
            .contract-badge {
              display: inline-block;
              background: ${brandColor};
              color: white;
              padding: 6px 14px;
              font-size: 11px;
              font-weight: 600;
              border-radius: 4px;
              margin-bottom: 6px;
            }
            .order-date { font-size: 10px; color: #6b7280; }

            /* Reference Box */
            .ref-box {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 1px;
              background: #e5e7eb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .ref-item {
              background: #f9fafb;
              padding: 8px 10px;
              text-align: center;
            }
            .ref-item .lbl { font-size: 8px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
            .ref-item .val { font-size: 11px; font-weight: 600; color: #111827; margin-top: 2px; }

            /* Two Column Layout */
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

            /* Info Box */
            .info-box {
              border: 1px solid #d1d5db;
              border-radius: 6px;
              overflow: hidden;
            }
            .info-box-header {
              background: linear-gradient(to right, ${brandColor}, ${brandColor}dd);
              color: white;
              padding: 6px 12px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-box-content {
              padding: 12px;
            }
            .info-box-content .name {
              font-size: 13px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 4px;
            }
            .info-box-content .detail {
              font-size: 10px;
              color: #4b5563;
              line-height: 1.4;
            }

            /* Section Title */
            .section-title {
              background: ${brandColor};
              color: white;
              padding: 6px 12px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-radius: 4px 4px 0 0;
              margin-bottom: 0;
            }

            /* Vehicle Section */
            .vehicle-section {
              border: 1px solid #d1d5db;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .vehicle-badge {
              display: inline-block;
              background: ${brandColor};
              color: white;
              padding: 2px 10px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              border-radius: 3px;
              margin: 10px 12px 8px;
            }
            .vehicle-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1px;
              background: #e5e7eb;
              margin: 0 1px 1px 1px;
            }
            .vehicle-grid .cell {
              background: white;
              padding: 8px 10px;
            }
            .vehicle-grid .cell .lbl { font-size: 8px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.3px; }
            .vehicle-grid .cell .val { font-size: 10px; font-weight: 500; color: #111827; margin-top: 2px; }

            /* Itemization Table */
            .itemization-section {
              border: 1px solid #d1d5db;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .itemization-table { width: 100%; border-collapse: collapse; }
            .itemization-table th {
              text-align: left;
              padding: 6px 12px;
              background: #f3f4f6;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              color: #6b7280;
              border-bottom: 1px solid #e5e7eb;
            }
            .itemization-table td {
              padding: 7px 12px;
              font-size: 10px;
              border-bottom: 1px solid #f3f4f6;
            }
            .itemization-table td:last-child {
              text-align: right;
              font-family: 'SF Mono', 'Monaco', monospace;
              font-size: 10px;
            }
            .itemization-table tr.subtotal td {
              background: #f9fafb;
              font-weight: 600;
              border-top: 1px solid #e5e7eb;
            }
            .itemization-table tr.total td {
              background: ${brandColor};
              color: white;
              font-weight: 700;
              font-size: 12px;
              padding: 10px 12px;
            }
            .itemization-table tr.section-header td {
              background: #f3f4f6;
              font-weight: 600;
              font-size: 9px;
              text-transform: uppercase;
              color: #6b7280;
              padding: 5px 12px;
            }

            /* Trade-In Section */
            .tradein-section {
              border: 1px solid #d1d5db;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .tradein-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1px;
              background: #e5e7eb;
              margin: 0 1px 1px 1px;
            }
            .tradein-grid .cell {
              background: white;
              padding: 8px 10px;
            }
            .tradein-grid .cell .lbl { font-size: 8px; text-transform: uppercase; color: #6b7280; }
            .tradein-grid .cell .val { font-size: 10px; font-weight: 500; margin-top: 2px; }
            .lienholder-box {
              margin: 0 12px 12px;
              padding: 10px 12px;
              background: #fef3c7;
              border-radius: 4px;
              border-left: 3px solid #f59e0b;
            }
            .lienholder-box .title { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #92400e; margin-bottom: 4px; }
            .lienholder-box .info { font-size: 9px; color: #78350f; line-height: 1.5; }

            /* Warranty Section */
            .warranty-section {
              border: 1px solid #d1d5db;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .warranty-content { padding: 12px; }
            .warranty-item {
              padding: 10px 12px;
              background: #f0fdf4;
              border-radius: 4px;
              margin-bottom: 8px;
              border-left: 3px solid #22c55e;
            }
            .warranty-item:last-child { margin-bottom: 0; }
            .warranty-item .title { font-size: 10px; font-weight: 600; color: #166534; margin-bottom: 4px; }
            .warranty-item .desc { font-size: 9px; color: #15803d; line-height: 1.4; }
            .warranty-item ul { margin: 6px 0 0 16px; }
            .warranty-item li { font-size: 9px; color: #15803d; margin: 2px 0; }
            .warranty-notes {
              padding: 10px 12px;
              background: #fffbeb;
              border-radius: 4px;
              border-left: 3px solid #f59e0b;
              margin-top: 8px;
            }
            .warranty-notes .title { font-size: 9px; font-weight: 600; color: #92400e; }
            .warranty-notes .text { font-size: 9px; color: #78350f; margin-top: 2px; }

            /* Signatures */
            .signatures-section {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
            }
            .signature-block { }
            .signature-line {
              border-bottom: 1px solid #374151;
              height: 40px;
              margin-bottom: 6px;
            }
            .signature-label {
              font-size: 9px;
              color: #6b7280;
              display: flex;
              justify-content: space-between;
            }

            /* Footer */
            .footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 8px;
              color: #9ca3af;
            }

            /* Page 2 Styles */
            .page-break { page-break-before: always; }
            .terms-content {
              padding: 16px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
            }
            .terms-content h4 {
              font-size: 11px;
              color: #111827;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .terms-content p {
              font-size: 9px;
              color: #4b5563;
              margin-bottom: 10px;
              text-align: justify;
              line-height: 1.5;
            }
            .terms-content p strong {
              color: #111827;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { padding: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header -->
            <div class="header">
              <div class="header-left">
                <div class="header-title">BUYER'S ORDER</div>
                <div class="dealer-info">
                  <div class="name">${getDealerFullNameHTML()}</div>
                  <div>${dealerAddress}</div>
                  <div>${dealerCity}, ${dealerState} ${dealerZip}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="contract-badge">${contractNo}</div>
                <div class="order-date">${formatDate(orderDate)}</div>
              </div>
            </div>

            <!-- Reference Box -->
            <div class="ref-box">
              <div class="ref-item"><div class="lbl">Order Date</div><div class="val">${formatDate(orderDate)}</div></div>
              <div class="ref-item"><div class="lbl">Stock No.</div><div class="val">${stockNo || "—"}</div></div>
              <div class="ref-item"><div class="lbl">App No.</div><div class="val">${appNo || "—"}</div></div>
              <div class="ref-item"><div class="lbl">Contract</div><div class="val">${contractNo}</div></div>
              <div class="ref-item"><div class="lbl">Salesperson</div><div class="val">${salesperson || "—"}</div></div>
            </div>

            <!-- Parties -->
            <div class="two-col">
              <div class="info-box">
                <div class="info-box-header">Seller Information</div>
                <div class="info-box-content">
                  <div class="name">${getDealerFullNameHTML()}</div>
                  <div class="detail">${dealerAddress}<br>${dealerCity}, ${dealerState} ${dealerZip}</div>
                </div>
              </div>
              <div class="info-box">
                <div class="info-box-header">Buyer Information${coBuyerName ? " / Co-Buyer" : ""}</div>
                <div class="info-box-content">
                  <div class="name">${buyerName}${coBuyerName ? ` & ${coBuyerName}` : ""}</div>
                  <div class="detail">${buyerAddress || "Address on file"}<br>${buyerCity}, ${buyerState} ${buyerZip}</div>
                </div>
              </div>
            </div>

            <!-- Vehicle Information -->
            <div class="vehicle-section">
              <div class="section-title">Vehicle Information</div>
              <div class="vehicle-badge">${vehicleCondition}</div>
              <div class="vehicle-grid">
                <div class="cell"><div class="lbl">Year</div><div class="val">${vehicleYear}</div></div>
                <div class="cell"><div class="lbl">Make</div><div class="val">${vehicleMake}</div></div>
                <div class="cell"><div class="lbl">Model</div><div class="val">${vehicleModel}</div></div>
                <div class="cell"><div class="lbl">Body Style</div><div class="val">${vehicleBodyStyle || "—"}</div></div>
                <div class="cell"><div class="lbl">VIN</div><div class="val">${vehicleVin || "—"}</div></div>
                <div class="cell"><div class="lbl">License No.</div><div class="val">${vehicleLicenseNo || "—"}</div></div>
                <div class="cell"><div class="lbl">Odometer</div><div class="val">${vehicleOdometer ? parseInt(vehicleOdometer).toLocaleString() + " mi" : "—"}</div></div>
                <div class="cell"><div class="lbl">Exterior Color</div><div class="val">${vehicleColor || "—"}</div></div>
              </div>
            </div>

            ${hasTradeIn ? `
            <div class="tradein-section">
              <div class="section-title">Trade-In Vehicle</div>
              <div class="tradein-grid">
                <div class="cell"><div class="lbl">Year</div><div class="val">${tradeIn.year}</div></div>
                <div class="cell"><div class="lbl">Make</div><div class="val">${tradeIn.make}</div></div>
                <div class="cell"><div class="lbl">Model</div><div class="val">${tradeIn.model}</div></div>
                <div class="cell"><div class="lbl">Body Style</div><div class="val">${tradeIn.bodyStyle || "—"}</div></div>
                <div class="cell"><div class="lbl">VIN</div><div class="val">${tradeIn.vin}</div></div>
                <div class="cell"><div class="lbl">License No.</div><div class="val">${tradeIn.licenseNo || "—"}</div></div>
                <div class="cell"><div class="lbl">Odometer</div><div class="val">${tradeIn.odometer || "—"}</div></div>
                <div class="cell"><div class="lbl">Color</div><div class="val">${tradeIn.color || "—"}</div></div>
              </div>
              ${tradeIn.lienholderName ? `
              <div class="lienholder-box">
                <div class="title">Lienholder Information</div>
                <div class="info">
                  <strong>${tradeIn.lienholderName}</strong><br>
                  ${tradeIn.lienholderAddress}<br>
                  Phone: ${tradeIn.lienholderPhone}<br>
                  Payoff: ${formatCurrency(tradeIn.payoff)} (Good through: ${tradeIn.payoffGoodThrough})
                </div>
              </div>
              ` : ""}
            </div>
            ` : ""}

            <!-- Itemization of Sale -->
            <div class="itemization-section">
              <div class="section-title">Itemization of Sale</div>
              <table class="itemization-table">
                <tr><td>Vehicle Sales Price</td><td>${formatCurrency(vehicleSalesPrice)}</td></tr>
                <tr><td>Sales Tax (${salesTaxRate}%)</td><td>${formatCurrency(salesTax)}</td></tr>
                <tr class="subtotal"><td>Subtotal</td><td>${formatCurrency(subtotal)}</td></tr>

                <tr class="section-header"><td colspan="2">Fees & Charges</td></tr>
                ${fees.filter(f => f.description && f.amount > 0).map(f => `
                  <tr><td>${f.description}</td><td>${formatCurrency(f.amount)}</td></tr>
                `).join("")}
                <tr class="subtotal"><td>Total Fees</td><td>${formatCurrency(totalFees)}</td></tr>

                ${products.filter(p => p.description && p.amount > 0).length > 0 ? `
                <tr class="section-header"><td colspan="2">Additional Products</td></tr>
                ${products.filter(p => p.description && p.amount > 0).map(p => `
                  <tr><td>${p.description}</td><td>${formatCurrency(p.amount)}</td></tr>
                `).join("")}
                <tr class="subtotal"><td>Total Products</td><td>${formatCurrency(totalProducts)}</td></tr>
                ` : ""}

                <tr class="subtotal"><td>Cash Sale Price</td><td>${formatCurrency(cashSalePrice)}</td></tr>

                ${tradeInAllowance > 0 || cashDownPayment > 0 || deferredDownPayment > 0 ? `
                <tr class="section-header"><td colspan="2">Credits & Down Payment</td></tr>
                ${tradeInAllowance > 0 ? `<tr><td>Trade-in Allowance</td><td>${formatCurrency(tradeInAllowance)}</td></tr>` : ""}
                ${lessPayoff > 0 ? `<tr><td>Less: Trade Payoff</td><td>(${formatCurrency(lessPayoff)})</td></tr>` : ""}
                ${netTradeAllowance > 0 ? `<tr class="subtotal"><td>Net Trade Allowance</td><td>${formatCurrency(netTradeAllowance)}</td></tr>` : ""}
                ${cashDownPayment > 0 ? `<tr><td>Cash Down Payment</td><td>${formatCurrency(cashDownPayment)}</td></tr>` : ""}
                ${deferredDownPayment > 0 ? `<tr><td>Deferred Down Payment</td><td>${formatCurrency(deferredDownPayment)}</td></tr>` : ""}
                <tr class="subtotal"><td>Total Down Payment</td><td>${formatCurrency(totalDownPayment)}</td></tr>
                ` : ""}

                <tr class="total"><td><strong>TOTAL BALANCE DUE</strong></td><td><strong>${formatCurrency(totalBalanceDue)}</strong></td></tr>
              </table>
            </div>

            ${(warranty30DayReturn || warranty90DayPowertrain || warranty90DayDrivetrain || warrantyNotes) ? `
            <div class="warranty-section">
              <div class="section-title">Warranty Coverage</div>
              <div class="warranty-content">
                ${warranty30DayReturn ? `
                <div class="warranty-item">
                  <div class="title">30-Day Return Policy</div>
                  <ul>
                    <li>30-day return window from delivery date</li>
                    <li>Vehicle must be in original condition</li>
                    <li>Maximum +500 miles since delivery</li>
                    <li>No accidents, damage, or modifications</li>
                  </ul>
                </div>
                ` : ""}
                ${warranty90DayPowertrain ? `
                <div class="warranty-item">
                  <div class="title">90-Day Powertrain Warranty</div>
                  <div class="desc">Covers engine, transmission, and drivetrain components for 90 days from delivery.</div>
                </div>
                ` : ""}
                ${warranty90DayDrivetrain ? `
                <div class="warranty-item">
                  <div class="title">90-Day Drivetrain Warranty</div>
                  <div class="desc">Covers drivetrain components for 90 days from delivery.</div>
                </div>
                ` : ""}
                ${warrantyNotes ? `
                <div class="warranty-notes">
                  <div class="title">Additional Notes</div>
                  <div class="text">${warrantyNotes}</div>
                </div>
                ` : ""}
              </div>
            </div>
            ` : ""}

            <!-- Signatures -->
            <div class="signatures-section">
              <div class="signatures-grid">
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div class="signature-label">
                    <span>Buyer Signature</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div class="signature-label">
                    <span>${coBuyerName ? "Co-Buyer Signature" : "Dealer Representative"}</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
              </div>
              ${coBuyerName ? `
              <div class="signatures-grid" style="margin-top: 20px;">
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div class="signature-label">
                    <span>Dealer Representative</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
                <div></div>
              </div>
              ` : ""}
            </div>

            <div class="footer">
              This agreement is not binding until signed by an authorized representative of the Dealer. &nbsp;|&nbsp; Page 1 of 2
            </div>
          </div>

          <!-- Page 2 - Terms -->
          <div class="page page-break">
            <div class="header">
              <div class="header-left">
                <div class="header-title">TERMS & CONDITIONS</div>
                <div class="dealer-info">
                  <div class="name">${getDealerFullNameHTML()}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="contract-badge">${contractNo}</div>
              </div>
            </div>

            <div class="terms-content">
              <h4>Purchase Agreement Terms</h4>

              <p><strong>Definitions.</strong> "Contract" refers to this Buyer's Order. The pronouns "you" and "your" refer to each Buyer signing this Contract. The pronouns "we," "us" and "our" refer to the Dealer/Seller. "Vehicle" means the motor vehicle described in the Vehicle Information section. "Trade-in Vehicle" refers to the vehicle described in the Trade-in Information section.</p>

              <p><strong>Agreement to Purchase.</strong> You agree to buy the Vehicle from us for the price stated in this Contract. You agree to sign any documents necessary to complete this transaction. You represent that you are of legal age and have legal capacity to enter into this Contract.</p>

              <p><strong>Trade-in Vehicle.</strong> You will transfer title to the Trade-in Vehicle to us free of all liens except those noted on this Contract. You give permission to us to contact the lienholder(s) for payoff information. If the payoff information differs from the amount disclosed, you agree to pay the difference if actual balance is greater, or we will pay you if it's less.</p>

              <p><strong>Vehicle Inspection.</strong> You are purchasing the Vehicle based upon your personal inspection, and are not relying upon any opinion, statement, promise or representation of the salesperson or any other employee not contained in written agreements.</p>

              <p><strong>Vehicle Condition.</strong> You understand that the Vehicle may have sustained prior body damage and may have undergone mechanical repairs during or after manufacture, transit, or while in possession of prior owners.</p>

              <p><strong>Retail Installment Contract.</strong> If you enter into a retail installment contract for financing, those terms will control any inconsistencies between this Contract and the retail installment contract.</p>

              <p><strong>Delivery.</strong> Delivery of the Vehicle constitutes acceptance. Risk of loss passes to you upon delivery. You are responsible for insurance coverage from the moment of delivery.</p>

              <p><strong>Dispute Resolution.</strong> Any disputes arising from this Contract shall be resolved through binding arbitration in accordance with applicable state law. Both parties waive the right to a jury trial.</p>
            </div>

            <div class="footer">
              ${getDealerFullNameHTML()} &nbsp;|&nbsp; Buyer's Order ${contractNo} &nbsp;|&nbsp; Page 2 of 2
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const tabs = [
    { id: "info", label: "Info & Vehicle" },
    { id: "fees", label: "Fees & Products" },
    { id: "terms", label: "Warranty & Terms" },
    { id: "preview", label: "Preview" },
  ];

  // Wizard steps configuration
  const wizardSteps = [
    { id: "salesperson", title: "Salesperson", question: "Who is the salesperson?" },
    { id: "price", title: "Sale Price", question: "What is the agreed sale price?" },
    { id: "tradein", title: "Trade-In", question: "Does the customer have a trade-in?" },
    { id: "tradein_details", title: "Trade-In Details", question: "Enter trade-in details" },
    { id: "downpayment", title: "Down Payment", question: "Is there a down payment?" },
    { id: "fees", title: "Fees & Tax", question: "Enter fees and tax rate" },
    { id: "warranty", title: "Warranty", question: "Select warranty options" },
    { id: "review", title: "Review", question: "Review and confirm" },
  ];

  const getVisibleWizardSteps = () => {
    return wizardSteps.filter(step => {
      if (step.id === "tradein_details" && !hasTradeIn) return false;
      return true;
    });
  };

  const currentWizardStep = getVisibleWizardSteps()[wizardStep];

  const handleWizardNext = () => {
    const visibleSteps = getVisibleWizardSteps();
    if (wizardStep < visibleSteps.length - 1) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleWizardComplete = () => {
    setMode("form");
    setActiveTab("preview");
  };

  const renderWizardContent = () => {
    if (!currentWizardStep) return null;

    switch (currentWizardStep.id) {
      case "salesperson":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson Name</label>
              <input
                type="text"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LLC Name (optional)</label>
                <input
                  type="text"
                  value={llcName}
                  onChange={(e) => setLlcName(e.target.value)}
                  placeholder="e.g., ABC Motors LLC"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DBA Name</label>
                <input
                  type="text"
                  value={dealerDisplayName}
                  onChange={(e) => setDealerDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
            {llcName && dealerDisplayName && (
              <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                Will display as: <strong>{llcName} DBA {dealerDisplayName}</strong>
              </p>
            )}
          </div>
        );

      case "price":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Sale Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  value={vehicleSalesPrice || ""}
                  onChange={(e) => setVehicleSalesPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-4 text-2xl font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              {vehicle && (
                <p className="text-sm text-gray-500 mt-2">
                  Listed price: {formatCurrency(vehicle.askingPrice ? parseFloat(vehicle.askingPrice) : 0)}
                </p>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Vehicle Being Sold</h4>
              <p className="font-semibold">{vehicleYear} {vehicleMake} {vehicleModel} {vehicleOther}</p>
              <p className="text-sm text-gray-500">VIN: {vehicleVin || "Not set"}</p>
              <p className="text-sm text-gray-500">Stock #: {stockNo || "Not set"}</p>
            </div>
          </div>
        );

      case "tradein":
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Is the customer trading in a vehicle?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setHasTradeIn(true)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  hasTradeIn
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">&#128663;</div>
                <div className="font-semibold">Yes, trade-in</div>
                <div className="text-sm text-gray-500 mt-1">Customer has a vehicle to trade</div>
              </button>
              <button
                onClick={() => setHasTradeIn(false)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  !hasTradeIn
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">&#10060;</div>
                <div className="font-semibold">No trade-in</div>
                <div className="text-sm text-gray-500 mt-1">Straight purchase</div>
              </button>
            </div>
          </div>
        );

      case "tradein_details":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="text"
                  value={tradeIn.year}
                  onChange={(e) => setTradeIn({ ...tradeIn, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  value={tradeIn.make}
                  onChange={(e) => setTradeIn({ ...tradeIn, make: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={tradeIn.model}
                  onChange={(e) => setTradeIn({ ...tradeIn, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                <input
                  type="text"
                  value={tradeIn.vin}
                  onChange={(e) => setTradeIn({ ...tradeIn, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                <input
                  type="text"
                  value={tradeIn.odometer}
                  onChange={(e) => setTradeIn({ ...tradeIn, odometer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade-In Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={tradeInAllowance || ""}
                    onChange={(e) => setTradeInAllowance(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payoff Amount (if any)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={tradeIn.payoff || ""}
                    onChange={(e) => setTradeIn({ ...tradeIn, payoff: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            {tradeIn.payoff > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Net Trade Value:</strong> {formatCurrency(tradeInAllowance - tradeIn.payoff)}
                </p>
              </div>
            )}
          </div>
        );

      case "downpayment":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cash Down Payment</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  value={cashDownPayment || ""}
                  onChange={(e) => setCashDownPayment(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-4 text-xl font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deferred Down Payment (if any)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  value={deferredDownPayment || ""}
                  onChange={(e) => setDeferredDownPayment(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Payment to be collected at a later date</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex justify-between text-sm">
                <span>Total Down Payment</span>
                <span className="font-semibold">{formatCurrency(cashDownPayment + deferredDownPayment + netTradeAllowance)}</span>
              </div>
              {hasTradeIn && (
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>(Includes net trade: {formatCurrency(netTradeAllowance)})</span>
                </div>
              )}
            </div>
          </div>
        );

      case "fees":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={salesTaxRate || ""}
                  onChange={(e) => setSalesTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 7.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Tax: {formatCurrency(salesTax)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documentation Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={fees[0].amount || ""}
                    onChange={(e) => updateFee(fees[0].id, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={fees[1].amount || ""}
                    onChange={(e) => updateFee(fees[1].id, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License/Registration</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={fees[2].amount || ""}
                    onChange={(e) => updateFee(fees[2].id, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shipping/Delivery Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={fees[3].amount || ""}
                  onChange={(e) => updateFee(fees[3].id, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Fees</span>
                <span>{formatCurrency(totalFees)}</span>
              </div>
            </div>
          </div>
        );

      case "warranty":
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-2">Select the warranties included with this sale:</p>
            <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              warranty30DayReturn ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="checkbox"
                checked={warranty30DayReturn}
                onChange={(e) => setWarranty30DayReturn(e.target.checked)}
                className="w-5 h-5 mt-1 text-green-600 rounded"
              />
              <div>
                <div className="font-semibold text-gray-900">30-Day Return Policy</div>
                <p className="text-sm text-gray-600 mt-1">
                  30-day return window, max +500 miles, original condition required
                </p>
              </div>
            </label>
            <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              warranty90DayPowertrain ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="checkbox"
                checked={warranty90DayPowertrain}
                onChange={(e) => setWarranty90DayPowertrain(e.target.checked)}
                className="w-5 h-5 mt-1 text-green-600 rounded"
              />
              <div>
                <div className="font-semibold text-gray-900">90-Day Powertrain Warranty</div>
                <p className="text-sm text-gray-600 mt-1">
                  Covers engine, transmission, and drivetrain for 90 days
                </p>
              </div>
            </label>
            <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              warranty90DayDrivetrain ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="checkbox"
                checked={warranty90DayDrivetrain}
                onChange={(e) => setWarranty90DayDrivetrain(e.target.checked)}
                className="w-5 h-5 mt-1 text-green-600 rounded"
              />
              <div>
                <div className="font-semibold text-gray-900">90-Day Drivetrain Warranty</div>
                <p className="text-sm text-gray-600 mt-1">
                  Covers drivetrain components for 90 days
                </p>
              </div>
            </label>
          </div>
        );

      case "review":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ready to Generate
              </div>
              <p className="text-sm text-green-600">All information has been collected. Review the summary below.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-xs uppercase text-gray-500 mb-2">Vehicle</h4>
                <p className="font-semibold">{vehicleYear} {vehicleMake} {vehicleModel}</p>
                <p className="text-sm text-gray-600">Sale Price: {formatCurrency(vehicleSalesPrice)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-xs uppercase text-gray-500 mb-2">Customer</h4>
                <p className="font-semibold">{buyerName}</p>
                <p className="text-sm text-gray-600">{buyerCity}, {buyerState}</p>
              </div>
            </div>

            {hasTradeIn && (
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="text-xs uppercase text-amber-600 mb-2">Trade-In</h4>
                <p className="font-semibold">{tradeIn.year} {tradeIn.make} {tradeIn.model}</p>
                <p className="text-sm text-gray-600">
                  Allowance: {formatCurrency(tradeInAllowance)}
                  {tradeIn.payoff > 0 && ` (Payoff: ${formatCurrency(tradeIn.payoff)})`}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span>Vehicle Price</span>
                <span>{formatCurrency(vehicleSalesPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({salesTaxRate}%)</span>
                <span>{formatCurrency(salesTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fees</span>
                <span>{formatCurrency(totalFees)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-blue-200">
                <span>Cash Sale Price</span>
                <span>{formatCurrency(cashSalePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Down Payment</span>
                <span>-{formatCurrency(totalDownPayment)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-300 text-blue-700">
                <span>Balance Due</span>
                <span>{formatCurrency(totalBalanceDue)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {warranty30DayReturn && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">30-Day Return</span>
              )}
              {warranty90DayPowertrain && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">90-Day Powertrain</span>
              )}
              {warranty90DayDrivetrain && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">90-Day Drivetrain</span>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render wizard mode
  if (mode === "wizard") {
    const visibleSteps = getVisibleWizardSteps();
    const isLastStep = wizardStep === visibleSteps.length - 1;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Wizard Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Buyer's Order</h2>
              <p className="text-sm text-gray-500">
                Step {wizardStep + 1} of {visibleSteps.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMode("form"); setActiveTab("info"); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
              >
                Switch to Full Form
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex gap-1">
              {visibleSteps.map((step, i) => (
                <div
                  key={step.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= wizardStep ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">{currentWizardStep?.title}</span>
              <span className="text-xs text-gray-500">{Math.round(((wizardStep + 1) / visibleSteps.length) * 100)}% Complete</span>
            </div>
          </div>

          {/* Wizard Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentWizardStep?.question}</h3>
            {renderWizardContent()}
          </div>

          {/* Wizard Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div>
              {wizardStep > 0 && (
                <button
                  onClick={handleWizardBack}
                  className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              {isLastStep ? (
                <Button onClick={handleWizardComplete}>
                  Generate Buyer's Order
                </Button>
              ) : (
                <Button onClick={handleWizardNext}>
                  Continue
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render form mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Buyer's Order</h2>
            <p className="text-sm text-gray-500">Contract #{contractNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode("wizard"); setWizardStep(0); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
            >
              Switch to Wizard
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Header Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock No.</label>
                    <input type="text" value={stockNo} onChange={(e) => setStockNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App No.</label>
                    <input type="text" value={appNo} onChange={(e) => setAppNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract No.</label>
                    <input type="text" value={contractNo} onChange={(e) => setContractNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
                    <input type="text" value={salesperson} onChange={(e) => setSalesperson(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
              </Card>

              {/* Dealer Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Dealer/Seller Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLC Name (optional)</label>
                    <input type="text" value={llcName} onChange={(e) => setLlcName(e.target.value)}
                      placeholder="e.g., ABC Motors LLC"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DBA / Display Name</label>
                    <input type="text" value={dealerDisplayName} onChange={(e) => setDealerDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={dealerAddress} onChange={(e) => setDealerAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={dealerCity} onChange={(e) => setDealerCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input type="text" value={dealerState} onChange={(e) => setDealerState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input type="text" value={dealerZip} onChange={(e) => setDealerZip(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                {llcName && dealerDisplayName && (
                  <p className="mt-3 text-sm text-gray-500">
                    Will display as: <strong>{llcName} DBA {dealerDisplayName}</strong>
                  </p>
                )}
              </Card>

              {/* Buyer Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Buyer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                    <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Co-Buyer Name (optional)</label>
                    <input type="text" value={coBuyerName} onChange={(e) => setCoBuyerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input type="text" value={buyerState} onChange={(e) => setBuyerState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input type="text" value={buyerZip} onChange={(e) => setBuyerZip(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Vehicle Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                  <div className="flex gap-4">
                    {(["new", "used", "demo"] as const).map((c) => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="condition" checked={vehicleCondition === c}
                          onChange={() => setVehicleCondition(c)}
                          className="w-4 h-4 text-blue-600" />
                        <span className="text-sm capitalize">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input type="text" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Style</label>
                    <input type="text" value={vehicleBodyStyle} onChange={(e) => setVehicleBodyStyle(e.target.value)}
                      placeholder="Sedan, SUV, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                    <input type="text" value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License No.</label>
                    <input type="text" value={vehicleLicenseNo} onChange={(e) => setVehicleLicenseNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                    <input type="text" value={vehicleOdometer} onChange={(e) => setVehicleOdometer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trim/Other</label>
                    <input type="text" value={vehicleOther} onChange={(e) => setVehicleOther(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
              </Card>

              {/* Trade-In */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Trade-In Information</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={hasTradeIn} onChange={(e) => setHasTradeIn(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm">Has trade-in</span>
                  </label>
                </div>
                {hasTradeIn && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input type="text" value={tradeIn.year}
                          onChange={(e) => setTradeIn({ ...tradeIn, year: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                        <input type="text" value={tradeIn.make}
                          onChange={(e) => setTradeIn({ ...tradeIn, make: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input type="text" value={tradeIn.model}
                          onChange={(e) => setTradeIn({ ...tradeIn, model: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body Style</label>
                        <input type="text" value={tradeIn.bodyStyle}
                          onChange={(e) => setTradeIn({ ...tradeIn, bodyStyle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                        <input type="text" value={tradeIn.vin}
                          onChange={(e) => setTradeIn({ ...tradeIn, vin: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">License No.</label>
                        <input type="text" value={tradeIn.licenseNo}
                          onChange={(e) => setTradeIn({ ...tradeIn, licenseNo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                        <input type="text" value={tradeIn.odometer}
                          onChange={(e) => setTradeIn({ ...tradeIn, odometer: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                        <input type="text" value={tradeIn.color}
                          onChange={(e) => setTradeIn({ ...tradeIn, color: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Lienholder Information (if applicable)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lienholder Name</label>
                          <input type="text" value={tradeIn.lienholderName}
                            onChange={(e) => setTradeIn({ ...tradeIn, lienholderName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input type="text" value={tradeIn.lienholderPhone}
                            onChange={(e) => setTradeIn({ ...tradeIn, lienholderPhone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input type="text" value={tradeIn.lienholderAddress}
                            onChange={(e) => setTradeIn({ ...tradeIn, lienholderAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payoff Amount</label>
                          <input type="number" value={tradeIn.payoff}
                            onChange={(e) => setTradeIn({ ...tradeIn, payoff: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payoff Good Through</label>
                          <input type="date" value={tradeIn.payoffGoodThrough}
                            onChange={(e) => setTradeIn({ ...tradeIn, payoffGoodThrough: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-6">
              {/* Vehicle Price & Tax */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Vehicle Price</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">1. Vehicle Sales Price</label>
                    <input type="number" value={vehicleSalesPrice}
                      onChange={(e) => setVehicleSalesPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sales Tax Rate (%)</label>
                    <input type="number" step="0.01" value={salesTaxRate}
                      onChange={(e) => setSalesTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">2. Sales Tax</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                      {formatCurrency(salesTax)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">3. Subtotal (Lines 1+2)</span>
                    <span className="font-bold">{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </Card>

              {/* Fees */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Title, License & Other Fees</h3>
                  <button onClick={addFee} className="text-sm text-blue-600 hover:text-blue-700">+ Add Fee</button>
                </div>
                <div className="space-y-2">
                  {fees.map((fee, i) => (
                    <div key={fee.id} className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-1 text-sm text-gray-500">{4 + i}.</span>
                      <input type="text" value={fee.description}
                        onChange={(e) => updateFee(fee.id, "description", e.target.value)}
                        placeholder="Description"
                        className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input type="number" value={fee.amount || ""}
                        onChange={(e) => updateFee(fee.id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">15. Total Other Fees</span>
                    <span className="font-bold">{formatCurrency(totalFees)}</span>
                  </div>
                </div>
              </Card>

              {/* Products */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Additional Products</h3>
                  <button onClick={addProduct} className="text-sm text-blue-600 hover:text-blue-700">+ Add Product</button>
                </div>
                <div className="space-y-2">
                  {products.map((prod, i) => (
                    <div key={prod.id} className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-1 text-sm text-gray-500">{16 + i}.</span>
                      <input type="text" value={prod.description}
                        onChange={(e) => updateProduct(prod.id, "description", e.target.value)}
                        placeholder="Description"
                        className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input type="number" value={prod.amount || ""}
                        onChange={(e) => updateProduct(prod.id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">24. Total Products</span>
                    <span className="font-bold">{formatCurrency(totalProducts)}</span>
                  </div>
                </div>
              </Card>

              {/* Down Payment & Totals */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Down Payment & Balance</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">25. Cash Sale Price (Lines 3+15+24)</span>
                      <span className="font-bold">{formatCurrency(cashSalePrice)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">26. Trade-in Allowance</label>
                      <input type="number" value={tradeInAllowance}
                        onChange={(e) => setTradeInAllowance(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">27. Less Payoff</label>
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">{formatCurrency(lessPayoff)}</div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">28. Net Trade Allowance (26-27)</span>
                      <span className="font-bold">{formatCurrency(netTradeAllowance)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">29. Cash Down Payment</label>
                      <input type="number" value={cashDownPayment}
                        onChange={(e) => setCashDownPayment(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">30. Deferred Down Payment</label>
                      <input type="number" value={deferredDownPayment}
                        onChange={(e) => setDeferredDownPayment(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">31. Total Down Payment (28+29+30)</span>
                      <span className="font-bold">{formatCurrency(totalDownPayment)}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-600 text-white rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-bold">32. Total Balance Due (25-31)</span>
                      <span className="text-xl font-bold">{formatCurrency(totalBalanceDue)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="space-y-6">
              {/* Warranty Options */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Warranty Coverage</h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={warranty30DayReturn}
                      onChange={(e) => setWarranty30DayReturn(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded" />
                    <div>
                      <div className="font-medium text-gray-900">30-Day Return Policy</div>
                      <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                        <li>30-day return window from the date of delivery</li>
                        <li>Vehicle must be in original condition</li>
                        <li>Maximum +500 miles added since delivery</li>
                        <li>No accidents, damage, or modifications</li>
                        <li>Inspection required to confirm condition</li>
                      </ul>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={warranty90DayPowertrain}
                      onChange={(e) => setWarranty90DayPowertrain(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded" />
                    <div>
                      <div className="font-medium text-gray-900">90-Day Powertrain Warranty</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Covers engine, transmission, and drivetrain components for 90 days from delivery.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={warranty90DayDrivetrain}
                      onChange={(e) => setWarranty90DayDrivetrain(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded" />
                    <div>
                      <div className="font-medium text-gray-900">90-Day Drivetrain Warranty</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Covers drivetrain components for 90 days from delivery.
                      </p>
                    </div>
                  </label>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Warranty Notes</label>
                  <textarea value={warrantyNotes} onChange={(e) => setWarrantyNotes(e.target.value)}
                    placeholder="Add any additional warranty terms or notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                </div>
              </Card>

              {/* Terms Preview */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Additional Terms (Included in Document)</h3>
                <div className="text-sm text-gray-600 space-y-3 max-h-64 overflow-y-auto">
                  <p><strong>Definitions.</strong> "Contract" refers to this Buyer's Order. The pronouns "you" and "your" refer to each Buyer signing this Contract. The pronouns "we," "us" and "our" refer to the Dealer/Seller.</p>
                  <p><strong>Agreement to Purchase.</strong> You agree to buy the Vehicle from us for the price stated in this Contract. You agree to sign any documents necessary to complete this transaction.</p>
                  <p><strong>Trade-in Vehicle.</strong> You will transfer title to the Trade-in Vehicle to us free of all liens except those noted on this Contract.</p>
                  <p><strong>Vehicle Inspection.</strong> You are purchasing the Vehicle based upon your personal inspection.</p>
                  <p><strong>Vehicle Condition.</strong> You understand that the Vehicle may have sustained prior body damage and may have undergone prior mechanical repairs.</p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="bg-white rounded-lg shadow p-6 max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold" style={{ color: dealership.brandColor || "#1e40af" }}>
                    Buyer's Order
                  </h1>
                  <p className="text-gray-600">{getDealerFullName()}</p>
                  <p className="text-sm text-gray-500">Contract #{contractNo}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xs uppercase text-gray-500 mb-2">Dealer/Seller</h3>
                    <p className="font-semibold">{getDealerFullName()}</p>
                    <p className="text-sm text-gray-600">{dealerAddress}</p>
                    <p className="text-sm text-gray-600">{dealerCity}, {dealerState} {dealerZip}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xs uppercase text-gray-500 mb-2">Buyer</h3>
                    <p className="font-semibold">{buyerName}{coBuyerName ? ` / ${coBuyerName}` : ""}</p>
                    <p className="text-sm text-gray-600">{buyerAddress}</p>
                    <p className="text-sm text-gray-600">{buyerCity}, {buyerState} {buyerZip}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Vehicle</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="inline-block px-2 py-1 text-xs font-semibold uppercase rounded"
                      style={{ backgroundColor: dealership.brandColor || "#1e40af", color: "white" }}>
                      {vehicleCondition}
                    </span>
                    <p className="font-semibold mt-2">{vehicleYear} {vehicleMake} {vehicleModel} {vehicleOther}</p>
                    <p className="text-sm text-gray-600">VIN: {vehicleVin || "-"}</p>
                    <p className="text-sm text-gray-600">Odometer: {vehicleOdometer ? `${parseInt(vehicleOdometer).toLocaleString()} miles` : "-"}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between py-2">
                    <span>Vehicle Sales Price</span>
                    <span className="font-medium">{formatCurrency(vehicleSalesPrice)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Sales Tax ({salesTaxRate}%)</span>
                    <span>{formatCurrency(salesTax)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Total Fees</span>
                    <span>{formatCurrency(totalFees)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Total Products</span>
                    <span>{formatCurrency(totalProducts)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-semibold border-t">
                    <span>Cash Sale Price</span>
                    <span>{formatCurrency(cashSalePrice)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Total Down Payment</span>
                    <span>-{formatCurrency(totalDownPayment)}</span>
                  </div>
                  <div className="flex justify-between py-3 text-lg font-bold border-t"
                    style={{ color: dealership.brandColor || "#1e40af" }}>
                    <span>Total Balance Due</span>
                    <span>{formatCurrency(totalBalanceDue)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {activeTab !== "info" && (
              <button onClick={() => {
                const idx = tabs.findIndex(t => t.id === activeTab);
                if (idx > 0) setActiveTab(tabs[idx - 1].id as any);
              }} className="text-gray-600 hover:text-gray-800">
                &larr; Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {activeTab === "preview" ? (
              <>
                <Button variant="secondary" onClick={handlePrint}>Print / PDF</Button>
                <Button variant="secondary" onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save as Draft"}
                </Button>
                <Button onClick={handleSignAndSend} disabled={sending || !lead.primaryEmail}>
                  {sending ? "Sending..." : "Sign & Send to Customer"}
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                const idx = tabs.findIndex(t => t.id === activeTab);
                if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id as any);
              }}>
                Next &rarr;
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
