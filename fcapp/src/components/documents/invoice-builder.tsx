"use client";

import { useState, useRef, useEffect } from "react";
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

interface BuyersOrderInfo {
  id: string;
  contractNo: string;
  llcName: string;
  llcAddress: string;
  llcCity: string;
  llcState: string;
  llcZip: string;
  amount: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceBuilderProps {
  lead: Lead;
  vehicle?: Vehicle | null;
  dealership: Dealership;
  documentId?: string;
  currentUserName?: string;
  signedBuyersOrder?: BuyersOrderInfo | null;
  onClose: () => void;
  onSaved?: (documentId: string) => void;
}

export function InvoiceBuilder({
  lead,
  vehicle,
  dealership,
  documentId,
  currentUserName,
  signedBuyersOrder,
  onClose,
  onSaved,
}: InvoiceBuilderProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"wizard" | "form">("wizard");
  const [wizardStep, setWizardStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "items" | "preview">("details");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"wire" | "cashiers_check">("wire");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [bankCity, setBankCity] = useState("");
  const [bankState, setBankState] = useState("");
  const [bankZip, setBankZip] = useState("");

  // Wire transfer details
  const [wireAccountName, setWireAccountName] = useState("");
  const [wireAccountNumber, setWireAccountNumber] = useState("");
  const [wireRoutingNumber, setWireRoutingNumber] = useState("");

  // LLC Info (separate from dealership)
  const [llcName, setLlcName] = useState(signedBuyersOrder?.llcName || "");
  const [dealerDisplayName, setDealerDisplayName] = useState(dealership.name);
  const [llcAddress, setLlcAddress] = useState(signedBuyersOrder?.llcAddress || "");
  const [llcCity, setLlcCity] = useState(signedBuyersOrder?.llcCity || "");
  const [llcState, setLlcState] = useState(signedBuyersOrder?.llcState || "");
  const [llcZip, setLlcZip] = useState(signedBuyersOrder?.llcZip || "");

  // Customer Info
  const [customerName, setCustomerName] = useState(
    [lead.firstName, lead.lastName].filter(Boolean).join(" ")
  );
  const [customerEmail, setCustomerEmail] = useState(lead.primaryEmail || "");
  const [customerPhone, setCustomerPhone] = useState(lead.primaryPhone || "");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState(lead.city || "");
  const [customerState, setCustomerState] = useState(lead.state || "");
  const [customerZip, setCustomerZip] = useState(lead.zip || "");

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now().toString(36).toUpperCase()}`
  );
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split("T")[0];
  });
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");

  // Linked Buyer's Order
  const [linkedBuyersOrder, setLinkedBuyersOrder] = useState(signedBuyersOrder?.contractNo || "");
  const [hasBuyersOrder, setHasBuyersOrder] = useState(!!signedBuyersOrder);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (signedBuyersOrder) {
      return [{
        id: crypto.randomUUID(),
        description: `Payment as per Buyer's Order Number ${signedBuyersOrder.contractNo}`,
        quantity: 1,
        unitPrice: signedBuyersOrder.amount,
        amount: signedBuyersOrder.amount,
      }];
    }
    if (vehicle) {
      return [{
        id: crypto.randomUUID(),
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}${vehicle.vin ? ` (VIN: ${vehicle.vin})` : ""}`,
        quantity: 1,
        unitPrice: vehicle.askingPrice ? parseFloat(vehicle.askingPrice) : 0,
        amount: vehicle.askingPrice ? parseFloat(vehicle.askingPrice) : 0,
      }];
    }
    return [];
  });

  // Notes
  const [notes, setNotes] = useState("");

  // Tax rate
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState("Sales Tax");

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // LLC name formatting
  const getLlcFullName = () => {
    if (llcName && dealerDisplayName) {
      return `${llcName} DBA ${dealerDisplayName}`;
    }
    return llcName || dealerDisplayName;
  };

  const getLlcFullNameHTML = () => {
    if (llcName && dealerDisplayName) {
      return `<strong>${llcName}</strong> <span style="font-weight: normal;">DBA</span> <em>${dealerDisplayName}</em>`;
    }
    return `<strong>${llcName || dealerDisplayName}</strong>`;
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.amount = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Wizard steps configuration
  const wizardSteps = [
    { id: "buyers_order", title: "Buyer's Order", question: "Is this invoice linked to a Buyer's Order?" },
    { id: "llc_info", title: "LLC Information", question: "Enter LLC/Company information" },
    { id: "payment_method", title: "Payment Method", question: "How will the customer pay?" },
    { id: "amount", title: "Invoice Amount", question: "What is the invoice amount?" },
    { id: "customer", title: "Customer", question: "Confirm customer information" },
    { id: "review", title: "Review", question: "Review and confirm" },
  ];

  const getVisibleWizardSteps = () => {
    return wizardSteps.filter(step => {
      // Skip LLC info step if we have a signed buyer's order
      if (step.id === "llc_info" && signedBuyersOrder) return false;
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
      case "buyers_order":
        return (
          <div className="space-y-6">
            {signedBuyersOrder ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Signed Buyer's Order Found</span>
                </div>
                <p className="text-green-600 text-sm">
                  This invoice will reference Buyer's Order <strong>{signedBuyersOrder.contractNo}</strong> and use the LLC details from it.
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Amount: <strong>{formatCurrency(signedBuyersOrder.amount)}</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setHasBuyersOrder(true)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      hasBuyersOrder
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Yes, link to Buyer's Order</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Reference an existing Buyer's Order number
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasBuyersOrder(false);
                      setLinkedBuyersOrder("");
                    }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      !hasBuyersOrder
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">No, standalone invoice</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Create an invoice without a Buyer's Order
                      </div>
                    </div>
                  </button>
                </div>

                {hasBuyersOrder && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buyer's Order Number
                    </label>
                    <input
                      type="text"
                      value={linkedBuyersOrder}
                      onChange={(e) => {
                        setLinkedBuyersOrder(e.target.value);
                        // Update line item description
                        if (e.target.value && lineItems.length > 0) {
                          setLineItems([{
                            ...lineItems[0],
                            description: `Payment as per Buyer's Order Number ${e.target.value}`,
                          }]);
                        }
                      }}
                      placeholder="e.g., BO-ABC123"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "llc_info":
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-700 text-sm">
                Enter the LLC information that will appear on the invoice. The dealership address is shown separately at the top.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLC Name
                </label>
                <input
                  type="text"
                  value={llcName}
                  onChange={(e) => setLlcName(e.target.value)}
                  placeholder="e.g., ABC Motors LLC"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DBA (Doing Business As)
                </label>
                <input
                  type="text"
                  value={dealerDisplayName}
                  onChange={(e) => setDealerDisplayName(e.target.value)}
                  placeholder="e.g., Classic Cars of Miami"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {llcName && dealerDisplayName && (
              <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                Will display as: <strong>{llcName}</strong> DBA <em>{dealerDisplayName}</em>
              </p>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4">LLC Address (for payment)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={llcAddress}
                    onChange={(e) => setLlcAddress(e.target.value)}
                    placeholder="123 Business Ave"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={llcCity}
                    onChange={(e) => setLlcCity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={llcState}
                      onChange={(e) => setLlcState(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                    <input
                      type="text"
                      value={llcZip}
                      onChange={(e) => setLlcZip(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "payment_method":
        return (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("wire")}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "wire"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Wire Transfer</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Customer sends payment via bank wire
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cashiers_check")}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "cashiers_check"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Cashier's Check</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Customer gets check at their bank's local branch
                  </div>
                </div>
              </button>
            </div>

            {paymentMethod === "wire" && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-4">Wire Transfer Details</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Enter your bank account information to receive wire transfers
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={wireAccountName}
                      onChange={(e) => setWireAccountName(e.target.value)}
                      placeholder="e.g., ABC Motors LLC"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={wireAccountNumber}
                      onChange={(e) => setWireAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={wireRoutingNumber}
                      onChange={(e) => setWireRoutingNumber(e.target.value)}
                      placeholder="9-digit routing number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "cashiers_check" && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-4">Bank Branch Information</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the bank branch where the customer will get the cashier's check (usually a branch near the customer)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., Bank of America"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch Address
                    </label>
                    <input
                      type="text"
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      placeholder="123 Main St"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={bankCity}
                      onChange={(e) => setBankCity(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={bankState}
                        onChange={(e) => setBankState(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                      <input
                        type="text"
                        value={bankZip}
                        onChange={(e) => setBankZip(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "amount":
        return (
          <div className="space-y-6">
            {lineItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateLineItem(item.id, "unitPrice", val);
                          updateLineItem(item.id, "amount", val);
                        }}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addLineItem}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add another line item
            </button>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        );

      case "customer":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={customerZip}
                    onChange={(e) => setCustomerZip(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">From</h4>
                <p className="font-medium text-gray-900">{getLlcFullName()}</p>
                {llcAddress && <p className="text-sm text-gray-600">{llcAddress}</p>}
                <p className="text-sm text-gray-600">
                  {[llcCity, llcState, llcZip].filter(Boolean).join(", ")}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">To</h4>
                <p className="font-medium text-gray-900">{customerName}</p>
                {customerAddress && <p className="text-sm text-gray-600">{customerAddress}</p>}
                <p className="text-sm text-gray-600">
                  {[customerCity, customerState, customerZip].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Payment Method</h4>
              <p className="font-medium text-gray-900">
                {paymentMethod === "wire" ? "Wire Transfer" : "Cashier's Check"}
              </p>
              {paymentMethod === "cashiers_check" && bankName && (
                <p className="text-sm text-gray-600 mt-1">
                  At: {bankName}, {[bankCity, bankState].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-600 uppercase mb-2">Amount Due</h4>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(total)}</p>
              {linkedBuyersOrder && (
                <p className="text-sm text-blue-600 mt-1">
                  Reference: Buyer's Order {linkedBuyersOrder}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          documentType: "invoice",
          vehicleId: vehicle?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSaved?.(data.document.id);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save invoice");
      }
    } catch (error) {
      console.error("Failed to save invoice:", error);
      alert("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print the invoice");
      return;
    }

    const brandColor = dealership.brandColor || "#2563eb";

    const paymentInstructions = paymentMethod === "wire"
      ? `
        <h3>Wire Transfer Instructions</h3>
        <p>Please wire payment to:</p>
        ${wireAccountName ? `<p><strong>Account Name:</strong> ${wireAccountName}</p>` : `<p><strong>${getLlcFullName()}</strong></p>`}
        ${wireAccountNumber ? `<p><strong>Account Number:</strong> ${wireAccountNumber}</p>` : ""}
        ${wireRoutingNumber ? `<p><strong>Routing Number:</strong> ${wireRoutingNumber}</p>` : ""}
        ${llcAddress ? `<p class="note" style="margin-top: 12px;">Payee Address: ${llcAddress}, ${[llcCity, llcState, llcZip].filter(Boolean).join(", ")}</p>` : ""}
      `
      : `
        <h3>Cashier's Check Instructions</h3>
        <p>Please obtain a cashier's check made payable to:</p>
        <p><strong>${getLlcFullName()}</strong></p>
        ${bankName ? `
          <p class="bank-info">
            <strong>Bank:</strong> ${bankName}<br>
            ${bankAddress ? `${bankAddress}<br>` : ""}
            ${[bankCity, bankState, bankZip].filter(Boolean).join(", ")}
          </p>
        ` : ""}
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceNumber}</title>
          <style>
            @page { margin: 0.5in; size: letter; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; line-height: 1.5; padding: 40px; }
            .invoice { max-width: 800px; margin: 0 auto; }

            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${brandColor}; }
            .logo-section { max-width: 60%; }
            .logo { max-height: 60px; max-width: 200px; }
            .company-name { font-size: 24px; font-weight: bold; color: ${brandColor}; }
            .company-info { font-size: 12px; color: #6b7280; margin-top: 8px; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 36px; color: ${brandColor}; margin-bottom: 8px; letter-spacing: 2px; }
            .invoice-number { font-size: 14px; color: #6b7280; }

            .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .meta-section h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; letter-spacing: 1px; }
            .meta-section p { margin: 2px 0; font-size: 14px; }
            .meta-section .value { font-weight: 600; }

            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: ${brandColor}; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .items-table th:last-child { text-align: right; }
            .items-table td { padding: 16px 12px; border-bottom: 1px solid #e5e7eb; }
            .items-table td:last-child { text-align: right; font-weight: 600; }

            .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .totals-table { width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .totals-row.total { font-size: 20px; font-weight: bold; border-bottom: none; border-top: 3px solid ${brandColor}; padding-top: 12px; margin-top: 8px; color: ${brandColor}; }

            .payment-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .payment-info h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: ${brandColor}; }
            .payment-info p { font-size: 13px; color: #374151; margin: 4px 0; }
            .payment-info .note { font-style: italic; color: #6b7280; margin-top: 8px; }
            .payment-info .bank-info { margin-top: 12px; padding: 12px; background: white; border-radius: 6px; }

            .llc-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .llc-section h4 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; letter-spacing: 1px; }
            .llc-section p { font-size: 13px; color: #374151; }

            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; padding-top: 20px; border-top: 1px solid #e5e7eb; }

            @media print {
              body { padding: 0; }
              .invoice { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="logo-section">
                ${dealership.logoUrl ? `<img src="${dealership.logoUrl}" alt="${dealership.name}" class="logo" />` : `<div class="company-name">${dealership.name}</div>`}
                <div class="company-info">
                  ${dealership.address ? `${dealership.address}<br>` : ""}
                  ${[dealership.city, dealership.state, dealership.zip].filter(Boolean).join(", ")}<br>
                  ${dealership.phone ? `${dealership.phone}<br>` : ""}
                  ${dealership.email || ""}
                </div>
              </div>
              <div class="invoice-title">
                <h1>INVOICE</h1>
                <div class="invoice-number">${invoiceNumber}</div>
              </div>
            </div>

            <div class="invoice-meta">
              <div class="meta-section">
                <h3>Bill To</h3>
                <p class="value">${customerName}</p>
                ${customerAddress ? `<p>${customerAddress}</p>` : ""}
                <p>${[customerCity, customerState, customerZip].filter(Boolean).join(", ")}</p>
                ${customerPhone ? `<p>${customerPhone}</p>` : ""}
                ${customerEmail ? `<p>${customerEmail}</p>` : ""}
              </div>
              <div class="meta-section" style="text-align: right;">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Date:</strong> ${formatDate(invoiceDate)}</p>
                <p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>
                <p><strong>Payment Terms:</strong> ${paymentTerms}</p>
                ${linkedBuyersOrder ? `<p><strong>Reference:</strong> Buyer's Order ${linkedBuyersOrder}</p>` : ""}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 70%;">Description</th>
                  <th style="width: 30%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${formatCurrency(item.amount)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-table">
                <div class="totals-row">
                  <span>Subtotal</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                ${taxRate > 0 ? `
                <div class="totals-row">
                  <span>${taxLabel} (${taxRate}%)</span>
                  <span>${formatCurrency(taxAmount)}</span>
                </div>
                ` : ""}
                <div class="totals-row total">
                  <span>Total Due</span>
                  <span>${formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div class="payment-info">
              ${paymentInstructions}
            </div>

            ${(llcName || llcAddress) ? `
            <div class="llc-section">
              <h4>Payment To</h4>
              <p><strong>${getLlcFullName()}</strong></p>
              ${llcAddress ? `<p>${llcAddress}</p>` : ""}
              <p>${[llcCity, llcState, llcZip].filter(Boolean).join(", ")}</p>
            </div>
            ` : ""}

            ${notes ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h4 style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">Notes</h4>
              <p style="font-size: 13px; color: #6b7280; white-space: pre-wrap;">${notes}</p>
            </div>
            ` : ""}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="margin-top: 4px;">${getLlcFullName()}</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleSaveAndSend = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          documentType: "invoice",
          vehicleId: vehicle?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        await fetch(`/api/documents/${data.document.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });

        onSaved?.(data.document.id);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save invoice");
      }
    } catch (error) {
      console.error("Failed to save and send invoice:", error);
      alert("Failed to save and send invoice");
    } finally {
      setSending(false);
    }
  };

  // Render wizard mode
  if (mode === "wizard") {
    const visibleSteps = getVisibleWizardSteps();
    const isLastStep = wizardStep === visibleSteps.length - 1;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Invoice</h2>
              <p className="text-sm text-gray-500">Step {wizardStep + 1} of {visibleSteps.length}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${((wizardStep + 1) / visibleSteps.length) * 100}%` }}
              />
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

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMode("form"); setWizardStep(0); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
              >
                Switch to Full Form
              </button>
            </div>
            <div className="flex gap-3">
              {wizardStep > 0 && (
                <Button variant="secondary" onClick={handleWizardBack}>
                  Back
                </Button>
              )}
              {isLastStep ? (
                <Button onClick={handleWizardComplete}>
                  Review Invoice
                </Button>
              ) : (
                <Button onClick={handleWizardNext}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full form mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === "preview" ? "Preview Invoice" : "Create Invoice"}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === "preview"
                ? "Review before saving or printing"
                : "Fill in the invoice details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {[
            { id: "details", label: "Details" },
            { id: "items", label: "Line Items" },
            { id: "preview", label: "Preview" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => { setMode("wizard"); setWizardStep(0); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
            >
              Switch to Wizard
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Invoice Details */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buyer's Order #
                    </label>
                    <input
                      type="text"
                      value={linkedBuyersOrder}
                      onChange={(e) => setLinkedBuyersOrder(e.target.value)}
                      placeholder="e.g., BO-ABC123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </Card>

              {/* LLC Information */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">LLC Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLC Name</label>
                    <input
                      type="text"
                      value={llcName}
                      onChange={(e) => setLlcName(e.target.value)}
                      placeholder="e.g., ABC Motors LLC"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DBA Name</label>
                    <input
                      type="text"
                      value={dealerDisplayName}
                      onChange={(e) => setDealerDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLC Address</label>
                    <input
                      type="text"
                      value={llcAddress}
                      onChange={(e) => setLlcAddress(e.target.value)}
                      placeholder="Street address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={llcCity}
                      onChange={(e) => setLlcCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={llcState}
                        onChange={(e) => setLlcState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input
                        type="text"
                        value={llcZip}
                        onChange={(e) => setLlcZip(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
                {llcName && dealerDisplayName && (
                  <p className="mt-3 text-sm text-gray-500">
                    Will display as: <strong>{llcName}</strong> DBA <em>{dealerDisplayName}</em>
                  </p>
                )}
              </Card>

              {/* Payment Method */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={paymentMethod === "wire"}
                      onChange={() => setPaymentMethod("wire")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Wire Transfer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={paymentMethod === "cashiers_check"}
                      onChange={() => setPaymentMethod("cashiers_check")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Cashier's Check</span>
                  </label>
                </div>

                {paymentMethod === "wire" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={wireAccountName}
                        onChange={(e) => setWireAccountName(e.target.value)}
                        placeholder="e.g., ABC Motors LLC"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
                      <input
                        type="text"
                        value={wireAccountNumber}
                        onChange={(e) => setWireAccountNumber(e.target.value)}
                        placeholder="Account number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={wireRoutingNumber}
                        onChange={(e) => setWireRoutingNumber(e.target.value)}
                        placeholder="9-digit routing number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "cashiers_check" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., Bank of America"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
                      <input
                        type="text"
                        value={bankAddress}
                        onChange={(e) => setBankAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={bankCity}
                        onChange={(e) => setBankCity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={bankState}
                          onChange={(e) => setBankState(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                        <input
                          type="text"
                          value={bankZip}
                          onChange={(e) => setBankZip(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Customer Information */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Bill To</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Street address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP
                      </label>
                      <input
                        type="text"
                        value={customerZip}
                        onChange={(e) => setCustomerZip(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or payment instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </Card>
            </div>
          )}

          {activeTab === "items" && (
            <div className="space-y-6">
              {/* Line Items */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-7">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, "description", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateLineItem(item.id, "unitPrice", val);
                            updateLineItem(item.id, "amount", val * item.quantity);
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-1 pt-6">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tax */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Label
                      </label>
                      <input
                        type="text"
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{taxLabel} ({taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total Due</span>
                    <span className="text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "preview" && (
            <div ref={printRef} className="bg-white">
              <Card className="p-8">
                {/* Preview Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2" style={{ borderColor: dealership.brandColor || "#2563eb" }}>
                  <div>
                    {dealership.logoUrl ? (
                      <img
                        src={dealership.logoUrl}
                        alt={dealership.name}
                        className="h-12 max-w-[200px] object-contain"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold" style={{ color: dealership.brandColor || "#2563eb" }}>
                        {dealership.name}
                      </h2>
                    )}
                    <div className="text-sm text-gray-500 mt-2">
                      {dealership.address && <p>{dealership.address}</p>}
                      <p>{[dealership.city, dealership.state, dealership.zip].filter(Boolean).join(", ")}</p>
                      {dealership.phone && <p>{dealership.phone}</p>}
                      {dealership.email && <p>{dealership.email}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-bold" style={{ color: dealership.brandColor || "#2563eb" }}>
                      INVOICE
                    </h1>
                    <p className="text-gray-500 mt-1">{invoiceNumber}</p>
                  </div>
                </div>

                {/* Bill To & Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Bill To
                    </h3>
                    <p className="font-semibold text-gray-900">{customerName}</p>
                    {customerAddress && <p className="text-gray-600">{customerAddress}</p>}
                    <p className="text-gray-600">
                      {[customerCity, customerState, customerZip].filter(Boolean).join(", ")}
                    </p>
                    {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
                    {customerEmail && <p className="text-gray-600">{customerEmail}</p>}
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Invoice Details
                    </h3>
                    <p className="text-gray-600">
                      <span className="font-medium">Invoice Date:</span> {formatDate(invoiceDate)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Due Date:</span> {formatDate(dueDate)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Payment Terms:</span> {paymentTerms}
                    </p>
                    {linkedBuyersOrder && (
                      <p className="text-gray-600">
                        <span className="font-medium">Reference:</span> Buyer's Order {linkedBuyersOrder}
                      </p>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full mb-6">
                  <thead>
                    <tr style={{ backgroundColor: dealership.brandColor || "#2563eb" }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white uppercase">
                        Description
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="px-4 py-4">{item.description}</td>
                        <td className="px-4 py-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-72">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {taxRate > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">{taxLabel} ({taxRate}%)</span>
                        <span className="font-medium">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 text-lg font-bold" style={{ color: dealership.brandColor || "#2563eb" }}>
                      <span>Total Due</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Payment Information - {paymentMethod === "wire" ? "Wire Transfer" : "Cashier's Check"}
                  </h3>
                  {paymentMethod === "wire" ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Please wire payment to:
                      </p>
                      {wireAccountName && <p className="text-sm text-gray-600 mt-1"><strong>Account Name:</strong> {wireAccountName}</p>}
                      {wireAccountNumber && <p className="text-sm text-gray-600"><strong>Account Number:</strong> {wireAccountNumber}</p>}
                      {wireRoutingNumber && <p className="text-sm text-gray-600"><strong>Routing Number:</strong> {wireRoutingNumber}</p>}
                      {llcAddress && (
                        <p className="text-sm text-gray-500 italic mt-2">
                          Payee Address: {llcAddress}, {[llcCity, llcState, llcZip].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Please obtain a cashier's check made payable to:
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{getLlcFullName()}</p>
                      {bankName && (
                        <div className="mt-2 p-2 bg-white rounded">
                          <p className="text-sm text-gray-600">
                            <strong>Bank:</strong> {bankName}
                          </p>
                          {bankAddress && <p className="text-sm text-gray-600">{bankAddress}</p>}
                          <p className="text-sm text-gray-600">
                            {[bankCity, bankState, bankZip].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* LLC Info */}
                {(llcName || llcAddress) && (
                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Payment To
                    </h4>
                    <p className="text-sm font-medium text-gray-900">{getLlcFullName()}</p>
                    {llcAddress && <p className="text-sm text-gray-600">{llcAddress}</p>}
                    <p className="text-sm text-gray-600">
                      {[llcCity, llcState, llcZip].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 pt-6 border-t border-gray-200">
                  <p className="text-gray-500">Thank you for your business!</p>
                  <p className="text-gray-400 text-sm mt-1">{getLlcFullName()}</p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {activeTab !== "details" && (
              <button
                onClick={() => {
                  if (activeTab === "items") setActiveTab("details");
                  else if (activeTab === "preview") setActiveTab("items");
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                &larr; Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {activeTab === "preview" ? (
              <>
                <Button variant="secondary" onClick={handlePrint}>
                  Print / PDF
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Draft"}
                </Button>
                <Button onClick={handleSaveAndSend} disabled={sending}>
                  {sending ? "Sending..." : "Save & Send"}
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                if (activeTab === "details") setActiveTab("items");
                else if (activeTab === "items") setActiveTab("preview");
              }}>
                {activeTab === "items" ? "Preview Invoice" : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
