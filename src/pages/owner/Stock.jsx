import React, { useState, useEffect } from "react";
import {
  Package,
  ShoppingBag,
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Phone,
  User,
  Trash2,
  Edit3,
  Flame,
  FileText,
  Share2,
  Camera,
  Upload,
  Clock,
  Zap,
  Check
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import toast from "react-hot-toast";
import {
  getSupplements,
  addSupplement,
  updateSupplement,
  deleteSupplement,
  sellSupplement,
  getSupplementSales,
  getEquipment,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  logEquipmentRepair
} from "../../firebase/stock";
import { getMembers } from "../../firebase/members";
import { addExpense } from "../../firebase/expenses";
import { useAuth } from "../../contexts/AuthContext";

// Initial Demo Supplements if Firebase is pristine
const DEFAULT_SUPPLEMENTS = [
  {
    id: "sup_1",
    name: "Optimum Nutrition Gold Standard 100% Whey (5 lbs)",
    brand: "Optimum Nutrition",
    category: "Whey Protein",
    flavor: "Double Rich Chocolate",
    weight: "2.27 kg",
    purchaseCost: 5400,
    mrp: 7899,
    sellingPrice: 6699,
    quantity: 14,
    minThreshold: 4,
    photoUrl: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&auto=format&fit=crop&q=80",
    description: "24g whey isolate blend, 5.5g BCAAs per scoop. Certified authentic batch.",
    inStock: true
  },
  {
    id: "sup_2",
    name: "MuscleBlaze Creatine Monohydrate CreAMP",
    brand: "MuscleBlaze",
    category: "Creatine",
    flavor: "Unflavored",
    weight: "250g (83 Servings)",
    purchaseCost: 650,
    mrp: 1199,
    sellingPrice: 899,
    quantity: 26,
    minThreshold: 6,
    photoUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&auto=format&fit=crop&q=80",
    description: "Micronized Creapure grade creatine for explosive strength and muscle fullness.",
    inStock: true
  },
  {
    id: "sup_3",
    name: "C4 Original Pre-Workout High Explosive Energy",
    brand: "Cellucor",
    category: "Pre-Workout",
    flavor: "Fruit Punch",
    weight: "390g (60 Servings)",
    purchaseCost: 1800,
    mrp: 2999,
    sellingPrice: 2399,
    quantity: 3, // Low stock demo!
    minThreshold: 5,
    photoUrl: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=600&auto=format&fit=crop&q=80",
    description: "200mg Caffeine + Beta-Alanine pump formula for extreme focus during heavy lifts.",
    inStock: true
  },
  {
    id: "sup_4",
    name: "Univo Pro Heavy Duty Stainless Steel Shaker (750ml)",
    brand: "Univo Merch",
    category: "Merchandise",
    flavor: "Matte Black",
    weight: "750 ml",
    purchaseCost: 280,
    mrp: 699,
    sellingPrice: 499,
    quantity: 38,
    minThreshold: 10,
    photoUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    description: "Double-walled insulated leak-proof protein shaker with blender ball wire.",
    inStock: true
  }
];

// Initial Demo Equipment Fleet
const DEFAULT_EQUIPMENT = [
  {
    id: "eq_1",
    name: "Commercial Lat Pulldown & Low Row Combo",
    type: "Heavy Machine",
    brand: "Jerai Fitness",
    weightSpecs: "120 kg Pin-Selected Weight Stack",
    quantity: 2,
    condition: "Operational",
    purchaseDate: "2025-11-10",
    purchasePrice: 145000,
    vendorName: "Jerai Gym Equipment India",
    vendorPhone: "+91 98200 11223",
    lastServiceDate: "2026-08-15",
    serviceIntervalDays: 90,
    photoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
    serviceHistory: [
      {
        id: "srv_1",
        date: "2026-08-15",
        cost: 2400,
        technician: "Ramesh Sharma (Jerai Authorized)",
        technicianPhone: "+91 98211 44556",
        issue: "Cable fraying & pulley squeaking noise",
        actionTaken: "Replaced 6mm steel wire rope & greased dual nylon pulleys."
      }
    ]
  },
  {
    id: "eq_2",
    name: "Hex Rubber Dumbbell Complete Set (2.5kg to 35kg Pairs)",
    type: "Free Weights",
    brand: "Bullrock Fitness",
    weightSpecs: "14 Pairs (Total 525 kg Rubber Coated)",
    quantity: 28,
    condition: "Operational",
    purchaseDate: "2025-08-01",
    purchasePrice: 98000,
    vendorName: "Bullrock Strength Store",
    vendorPhone: "+91 98765 43210",
    lastServiceDate: "2026-06-20",
    serviceIntervalDays: 180,
    photoUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
    serviceHistory: []
  },
  {
    id: "eq_3",
    name: "Heavy Commercial AC Motor Treadmill T9000",
    type: "Cardio",
    brand: "Viva Fitness",
    weightSpecs: "5.5 HP AC Motor, 180kg Max User Weight",
    quantity: 3,
    condition: "Needs Maintenance",
    purchaseDate: "2025-06-15",
    purchasePrice: 320000,
    vendorName: "Viva Commercial Fitness",
    vendorPhone: "+91 99887 76655",
    lastServiceDate: "2026-05-10",
    serviceIntervalDays: 60,
    photoUrl: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=600&auto=format&fit=crop&q=80",
    serviceHistory: [
      {
        id: "srv_2",
        date: "2026-05-10",
        cost: 4500,
        technician: "Anil Kumar (Viva Tech)",
        technicianPhone: "+91 98112 33445",
        issue: "Running belt slipping during high speed",
        actionTaken: "Running belt alignment, tension adjustment & silicone lubrication."
      }
    ]
  },
  {
    id: "eq_4",
    name: "45-Degree Olympic Incline Leg Press (Plate Loaded)",
    type: "Heavy Machine",
    brand: "Being Strong",
    weightSpecs: "450 kg Max Plate Capacity, Linear Bearings",
    quantity: 1,
    condition: "Operational",
    purchaseDate: "2026-01-20",
    purchasePrice: 115000,
    vendorName: "Being Strong Official",
    vendorPhone: "+91 98700 99887",
    lastServiceDate: "2026-08-01",
    serviceIntervalDays: 90,
    photoUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
    serviceHistory: []
  }
];

export default function Stock() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";

  // Active Main Tab: 'supplements' or 'equipment'
  const [activeTab, setActiveTab] = useState("supplements");

  // State: Supplements
  const [supplements, setSupplements] = useState([]);
  const [supSearch, setSupSearch] = useState("");
  const [supCategory, setSupCategory] = useState("all");
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState(null);

  // Quick Sell Modal
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [sellForm, setSellForm] = useState({
    memberId: "",
    memberName: "Walk-in Member",
    memberPhone: "",
    quantity: 1,
    sellingPrice: 0,
    paymentMode: "Cash", // Cash, UPI, Card, Dues
    notes: ""
  });

  // State: Equipment Fleet
  const [equipmentList, setEquipmentList] = useState([]);
  const [eqSearch, setEqSearch] = useState("");
  const [eqFilterType, setEqFilterType] = useState("all");
  const [eqModalOpen, setEqModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState(null);

  // Service & Repair Log Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedEqForService, setSelectedEqForService] = useState(null);
  const [serviceHistoryModalOpen, setServiceHistoryModalOpen] = useState(false);
  const [selectedEqForHistory, setSelectedEqForHistory] = useState(null);

  const [repairForm, setRepairForm] = useState({
    date: new Date().toISOString().split("T")[0],
    cost: "",
    technician: "",
    technicianPhone: "",
    issue: "",
    actionTaken: "",
    condition: "Operational",
    addExpenseToPnl: true
  });

  // Form State: Supplement Add/Edit
  const [supForm, setSupForm] = useState({
    name: "",
    brand: "",
    category: "Whey Protein",
    flavor: "",
    weight: "",
    purchaseCost: "",
    mrp: "",
    sellingPrice: "",
    quantity: 10,
    minThreshold: 3,
    photoUrl: "",
    description: "",
    inStock: true
  });

  // Form State: Equipment Add/Edit
  const [eqForm, setEqForm] = useState({
    name: "",
    type: "Heavy Machine",
    brand: "",
    weightSpecs: "",
    quantity: 1,
    condition: "Operational",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    vendorName: "",
    vendorPhone: "",
    lastServiceDate: new Date().toISOString().split("T")[0],
    serviceIntervalDays: 90,
    photoUrl: "",
    addPurchaseExpense: false
  });

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      try {
        const [sups, eqs, mems] = await Promise.all([
          getSupplements(gymId),
          getEquipment(gymId),
          getMembers(gymId)
        ]);

        setSupplements(sups || []);
        setEquipmentList(eqs || []);
        setMembersList(mems || []);
      } catch (err) {
        console.warn("Stock data fetch fallback:", err);
        setSupplements([]);
        setEquipmentList([]);
        setMembersList([]);
      }
    }
    loadData();
  }, [gymId]);

  // --- SUPPLEMENT ACTIONS ---
  const handleOpenAddSupplement = () => {
    setEditingSup(null);
    setSupForm({
      name: "",
      brand: "",
      category: "Whey Protein",
      flavor: "",
      weight: "",
      purchaseCost: "",
      mrp: "",
      sellingPrice: "",
      quantity: 10,
      minThreshold: 3,
      photoUrl: "",
      description: "",
      inStock: true
    });
    setSupModalOpen(true);
  };

  const handleEditSupplement = (sup) => {
    setEditingSup(sup);
    setSupForm({ ...sup });
    setSupModalOpen(true);
  };

  const handleSaveSupplement = async (e) => {
    e.preventDefault();
    const data = {
      ...supForm,
      purchaseCost: Number(supForm.purchaseCost) || 0,
      mrp: Number(supForm.mrp) || 0,
      sellingPrice: Number(supForm.sellingPrice) || 0,
      quantity: Number(supForm.quantity) || 0,
      minThreshold: Number(supForm.minThreshold) || 3
    };

    try {
      if (editingSup) {
        await updateSupplement(gymId, editingSup.id, data);
        setSupplements(supplements.map((s) => (s.id === editingSup.id ? { ...s, ...data } : s)));
        toast.success("Supplement updated successfully!");
      } else {
        const newId = "sup_" + Date.now();
        const payload = { ...data, id: newId };
        await addSupplement(gymId, payload);
        setSupplements([payload, ...supplements]);
        toast.success("New supplement added to Gym Store!");
      }
      setSupModalOpen(false);
    } catch (err) {
      toast.error("Failed to save supplement");
    }
  };

  const handleDeleteSupplement = async (id) => {
    if (!window.confirm("Are you sure you want to remove this supplement from inventory?")) return;
    try {
      await deleteSupplement(gymId, id);
      setSupplements(supplements.filter((s) => s.id !== id));
      toast.success("Product removed from inventory");
    } catch (err) {
      toast.error("Failed to delete product");
    }
  };

  // Open Quick Sell Modal
  const handleOpenSellModal = (product) => {
    setSelectedProductForSale(product);
    setSellForm({
      memberId: "",
      memberName: "Walk-in Customer",
      memberPhone: "",
      quantity: 1,
      sellingPrice: product.sellingPrice,
      paymentMode: "Cash",
      notes: ""
    });
    setSellModalOpen(true);
  };

  const handleConfirmSale = async (e) => {
    e.preventDefault();
    if (!selectedProductForSale) return;
    if (sellForm.quantity > selectedProductForSale.quantity) {
      toast.error(`Only ${selectedProductForSale.quantity} units available in stock!`);
      return;
    }

    const totalAmount = Number(sellForm.sellingPrice) * Number(sellForm.quantity);
    const saleData = {
      productName: selectedProductForSale.name,
      productBrand: selectedProductForSale.brand,
      quantitySold: Number(sellForm.quantity),
      unitPrice: Number(sellForm.sellingPrice),
      totalAmount,
      memberId: sellForm.memberId,
      memberName: sellForm.memberName,
      memberPhone: sellForm.memberPhone,
      paymentMode: sellForm.paymentMode,
      notes: sellForm.notes,
      currentStock: selectedProductForSale.quantity
    };

    try {
      await sellSupplement(gymId, selectedProductForSale.id, saleData);
      
      // Update local state
      const updatedQty = selectedProductForSale.quantity - sellForm.quantity;
      setSupplements(
        supplements.map((s) => (s.id === selectedProductForSale.id ? { ...s, quantity: updatedQty } : s))
      );

      toast.success(`Sale Recorded! Rs. ${totalAmount.toLocaleString("en-IN")} received via ${sellForm.paymentMode}`);
      setSellModalOpen(false);
    } catch (err) {
      toast.error("Failed to record sale");
    }
  };

  // --- EQUIPMENT ACTIONS ---
  const handleOpenAddEquipment = () => {
    setEditingEq(null);
    setEqForm({
      name: "",
      type: "Heavy Machine",
      brand: "",
      weightSpecs: "",
      quantity: 1,
      condition: "Operational",
      purchaseDate: new Date().toISOString().split("T")[0],
      purchasePrice: "",
      vendorName: "",
      vendorPhone: "",
      lastServiceDate: new Date().toISOString().split("T")[0],
      serviceIntervalDays: 90,
      photoUrl: "",
      addPurchaseExpense: false
    });
    setEqModalOpen(true);
  };

  const handleEditEquipment = (eq) => {
    setEditingEq(eq);
    setEqForm({
      ...eq,
      addPurchaseExpense: false
    });
    setEqModalOpen(true);
  };

  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    const data = {
      ...eqForm,
      quantity: Number(eqForm.quantity) || 1,
      purchasePrice: Number(eqForm.purchasePrice) || 0,
      serviceIntervalDays: Number(eqForm.serviceIntervalDays) || 90
    };

    try {
      if (editingEq) {
        await updateEquipment(gymId, editingEq.id, data);
        setEquipmentList(equipmentList.map((eq) => (eq.id === editingEq.id ? { ...eq, ...data } : eq)));
        toast.success("Equipment details updated!");
      } else {
        const newId = "eq_" + Date.now();
        const payload = { ...data, id: newId, serviceHistory: [] };
        await addEquipment(gymId, payload);

        // Auto add to expense if checked
        if (eqForm.addPurchaseExpense && data.purchasePrice > 0) {
          try {
            await addExpense(gymId, {
              title: `Capital Asset: New ${data.name} (${data.brand || "Gym Machinery"})`,
              category: "Equipment",
              type: "onetime",
              amount: data.purchasePrice,
              date: data.purchaseDate
            });
          } catch (eExp) {
            console.warn("Auto expense failed:", eExp);
          }
        }

        setEquipmentList([payload, ...equipmentList]);
        toast.success("New machine added to Gym Equipment Fleet!");
      }
      setEqModalOpen(false);
    } catch (err) {
      toast.error("Failed to save equipment");
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this equipment from inventory?")) return;
    try {
      await deleteEquipment(gymId, id);
      setEquipmentList(equipmentList.filter((eq) => eq.id !== id));
      toast.success("Equipment deleted from records");
    } catch (err) {
      toast.error("Failed to delete equipment");
    }
  };

  // Open Log Repair/Service Modal
  const handleOpenServiceModal = (eq) => {
    setSelectedEqForService(eq);
    setRepairForm({
      date: new Date().toISOString().split("T")[0],
      cost: "",
      technician: "",
      technicianPhone: "",
      issue: "",
      actionTaken: "",
      condition: "Operational",
      addExpenseToPnl: true
    });
    setServiceModalOpen(true);
  };

  const handleSaveRepairLog = async (e) => {
    e.preventDefault();
    if (!selectedEqForService) return;

    try {
      const updatedHistory = await logEquipmentRepair(
        gymId,
        selectedEqForService.id,
        repairForm,
        selectedEqForService.serviceHistory || []
      );

      // Auto add repair cost to expenses
      if (repairForm.addExpenseToPnl && Number(repairForm.cost) > 0) {
        try {
          await addExpense(gymId, {
            title: `Repair & Service: ${selectedEqForService.name}`,
            category: "Maintenance",
            type: "onetime",
            amount: Number(repairForm.cost),
            date: repairForm.date
          });
        } catch (eExp) {
          console.warn("Repair expense log failed:", eExp);
        }
      }

      setEquipmentList(
        equipmentList.map((eq) =>
          eq.id === selectedEqForService.id
            ? {
                ...eq,
                lastServiceDate: repairForm.date,
                condition: repairForm.condition,
                serviceHistory: updatedHistory
              }
            : eq
        )
      );

      toast.success("Service & Repair log recorded successfully!");
      setServiceModalOpen(false);
    } catch (err) {
      toast.error("Failed to record service log");
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = (eq) => {
    setSelectedEqForHistory(eq);
    setServiceHistoryModalOpen(true);
  };

  // Helper for overdue calculation
  const getServiceStatus = (eq) => {
    if (!eq.lastServiceDate) return { isOverdue: false, daysLeft: 0, text: "No service history" };
    const last = new Date(eq.lastServiceDate).getTime();
    const intervalDays = eq.serviceIntervalDays || 90;
    const nextDue = last + intervalDays * 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((nextDue - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { isOverdue: true, daysLeft: Math.abs(diffDays), text: `Overdue by ${Math.abs(diffDays)} days` };
    }
    return { isOverdue: false, daysLeft: diffDays, text: `Due in ${diffDays} days` };
  };

  // --- STATS CALCULATIONS ---
  // Supplements Stats
  const totalSupplementUnits = supplements.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const totalSupplementStockCost = supplements.reduce(
    (acc, s) => acc + (Number(s.purchaseCost) || 0) * (Number(s.quantity) || 0),
    0
  );
  const totalSupplementRetailValue = supplements.reduce(
    (acc, s) => acc + (Number(s.sellingPrice) || 0) * (Number(s.quantity) || 0),
    0
  );
  const lowStockCount = supplements.filter((s) => Number(s.quantity) <= (Number(s.minThreshold) || 3)).length;

  // Equipment Stats
  const totalEquipmentAssetsValue = equipmentList.reduce(
    (acc, eq) => acc + (Number(eq.purchasePrice) || 0) * (Number(eq.quantity) || 1),
    0
  );
  const operationalCount = equipmentList.filter((eq) => eq.condition === "Operational").length;
  const overdueCount = equipmentList.filter((eq) => getServiceStatus(eq).isOverdue).length;
  const totalRepairSpent = equipmentList.reduce((acc, eq) => {
    const srvTotal = (eq.serviceHistory || []).reduce((sAcc, s) => sAcc + (Number(s.cost) || 0), 0);
    return acc + srvTotal;
  }, 0);

  // Filtered Supplements
  const filteredSupplements = supplements.filter((s) => {
    const matchSearch =
      (s.name || "").toLowerCase().includes(supSearch.toLowerCase()) ||
      (s.brand || "").toLowerCase().includes(supSearch.toLowerCase()) ||
      (s.flavor || "").toLowerCase().includes(supSearch.toLowerCase());
    const matchCat = supCategory === "all" || s.category === supCategory;
    return matchSearch && matchCat;
  });

  // Filtered Equipment
  const filteredEquipment = equipmentList.filter((eq) => {
    const matchSearch =
      (eq.name || "").toLowerCase().includes(eqSearch.toLowerCase()) ||
      (eq.brand || "").toLowerCase().includes(eqSearch.toLowerCase()) ||
      (eq.vendorName || "").toLowerCase().includes(eqSearch.toLowerCase());
    const matchType = eqFilterType === "all" || eq.type === eqFilterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock & Equipment Operations</h1>
              <p className="text-slate-500 text-xs">
                Comprehensive supplement retail store & gym machinery fleet maintenance
              </p>
            </div>
          </div>
        </div>

        {/* Master Navigation Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab("supplements")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "supplements"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Supplement & Merchandise Store</span>
            {lowStockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("equipment")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "equipment"
                ? "bg-white text-teal-700 shadow-sm border border-teal-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Gym Machines & Fleet Assets</span>
            {overdueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {overdueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* -------------------- TAB 1: SUPPLEMENT STORE & POS ---------------------- */}
      {/* ========================================================================= */}
      {activeTab === "supplements" && (
        <div className="space-y-6">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Retail Inventory Value</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Rs. {totalSupplementRetailValue.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  Est. Profit: Rs. {(totalSupplementRetailValue - totalSupplementStockCost).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Units In Stock</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalSupplementUnits} Bottles / Boxes</h3>
                <p className="text-[11px] text-slate-500 mt-1">{supplements.length} Unique Product SKUs</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Inventory Cost Invested</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Rs. {totalSupplementStockCost.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">Wholesale Cost Price</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Low Stock Re-order Alert</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{lowStockCount} Products</h3>
                <p className="text-[11px] text-rose-500 font-medium mt-1">Requires immediate restocking</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
                placeholder="Search protein, brand, flavor, shaker..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "Whey Protein", "Creatine", "Pre-Workout", "BCAA & EAA", "Vitamins & Fish Oil", "Merchandise"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSupCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      supCategory === cat
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {cat === "all" ? "All Products" : cat}
                  </button>
                )
              )}
            </div>

            {/* Add Product Button */}
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddSupplement}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0"
            >
              Add Product to Store
            </Button>
          </div>

          {/* Supplement Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredSupplements.map((item) => {
              const isLowStock = Number(item.quantity) <= Number(item.minThreshold || 3);
              const margin = item.mrp > 0 ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100) : 0;
              const profitPerUnit = Number(item.sellingPrice) - Number(item.purchaseCost);

              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden flex flex-col hover:border-emerald-300 transition-all group"
                >
                  {/* Product Image Banner */}
                  <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ShoppingBag className="w-10 h-10 stroke-1" />
                        <span className="text-[11px] font-semibold mt-1">No Image</span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 left-3">
                      {isLowStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Low: {item.quantity} left
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> In Stock: {item.quantity}
                        </span>
                      )}
                    </div>

                    {/* Discount Pill */}
                    {margin > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-black shadow-md">
                        {margin}% OFF
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span className="uppercase tracking-wider text-emerald-700 font-extrabold">
                          {item.brand || "Gym Authentic"}
                        </span>
                        <span>{item.category}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug line-clamp-2">
                        {item.name}
                      </h4>

                      {(item.flavor || item.weight) && (
                        <div className="flex items-center gap-2 mt-2">
                          {item.flavor && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {item.flavor}
                            </span>
                          )}
                          {item.weight && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {item.weight}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pricing Block */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black text-slate-900">
                            Rs. {Number(item.sellingPrice).toLocaleString("en-IN")}
                          </span>
                          {item.mrp > item.sellingPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              Rs. {Number(item.mrp).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cost: Rs. {Number(item.purchaseCost).toLocaleString("en-IN")} â€¢ Profit:{" "}
                          <span className="text-emerald-600 font-bold">
                            +Rs. {profitPerUnit.toLocaleString("en-IN")}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions: Direct POS Sell & Edit */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenSellModal(item)}
                        disabled={item.quantity <= 0}
                        className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm ${
                          item.quantity > 0
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" /> Sell Product
                      </button>

                      <button
                        onClick={() => handleEditSupplement(item)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSupplement(item.id)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- TAB 2: GYM EQUIPMENT FLEET & REPAIRS --------------- */}
      {/* ========================================================================= */}
      {activeTab === "equipment" && (
        <div className="space-y-6">
          {/* Top Asset & Maintenance Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Gym Machinery Capital Value</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Rs. {totalEquipmentAssetsValue.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-teal-600 font-bold mt-1">Total Fixed Machine Asset</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Operational Health</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {operationalCount} / {equipmentList.length} Units
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">In Peak Working Condition</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Maintenance Spent (History)</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Rs. {totalRepairSpent.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">All Recorded Repairs & Greasing</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Service Due / Overdue</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{overdueCount} Machines</h3>
                <p className="text-[11px] text-amber-600 font-medium mt-1">Needs inspection or lube</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={eqSearch}
                onChange={(e) => setEqSearch(e.target.value)}
                placeholder="Search machine, brand, vendor, dumbbell..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "Heavy Machine", "Free Weights", "Cardio", "Accessories"].map((t) => (
                <button
                  key={t}
                  onClick={() => setEqFilterType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    eqFilterType === t
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {t === "all" ? "All Equipment" : t}
                </button>
              ))}
            </div>

            {/* Add Equipment Button */}
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddEquipment}
              className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-bold text-xs shadow-md shadow-teal-500/20 shrink-0"
            >
              Add New Machine / Weights
            </Button>
          </div>

          {/* Equipment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEquipment.map((eq) => {
              const status = getServiceStatus(eq);
              const pastRepairs = eq.serviceHistory || [];
              const machineRepairTotal = pastRepairs.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);

              return (
                <div
                  key={eq.id}
                  className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden flex flex-col hover:border-teal-300 transition-all group"
                >
                  {/* Equipment Header Photo & Badges */}
                  <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {eq.photoUrl ? (
                      <img
                        src={eq.photoUrl}
                        alt={eq.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Wrench className="w-10 h-10 stroke-1" />
                        <span className="text-[11px] font-semibold mt-1">No Machine Photo</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                        {eq.type}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-teal-600/90 backdrop-blur-md text-white text-[10px] font-bold">
                        Qty: {eq.quantity}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-md flex items-center gap-1 ${
                          status.isOverdue
                            ? "bg-rose-500 text-white"
                            : eq.condition === "Operational"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        <Wrench className="w-3 h-3" /> {eq.condition}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span className="uppercase tracking-wider text-teal-700 font-extrabold">
                          {eq.brand || "Commercial Grade"}
                        </span>
                        <span>Purchased: {eq.purchaseDate || "N/A"}</span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-1 leading-snug">{eq.name}</h4>

                      {eq.weightSpecs && (
                        <p className="text-xs font-semibold text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          âš™ï¸ {eq.weightSpecs}
                        </p>
                      )}

                      {/* Financials & Vendor Details */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">Purchase Cost</p>
                          <p className="font-extrabold text-slate-900">
                            Rs. {Number(eq.purchasePrice).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Total Repair Spent</p>
                          <p className="font-extrabold text-teal-700">
                            Rs. {machineRepairTotal.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Service Timings & Health Indicator */}
                      <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Last Serviced:</span>
                          <span className="font-bold text-slate-800">{eq.lastServiceDate || "Not recorded"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Service Interval:</span>
                          <span className="font-semibold text-slate-700">Every {eq.serviceIntervalDays || 90} Days</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Status:</span>
                          <span
                            className={`font-bold ${
                              status.isOverdue ? "text-rose-600 animate-pulse" : "text-emerald-700"
                            }`}
                          >
                            {status.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Log Repair, View History, Edit */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenServiceModal(eq)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <Wrench className="w-3.5 h-3.5" /> Log Repair / Service
                        </button>

                        <button
                          onClick={() => handleOpenHistoryModal(eq)}
                          className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 transition"
                          title="View Complete Repair History"
                        >
                          <History className="w-4 h-4 text-slate-500" />
                          <span>{pastRepairs.length}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          onClick={() => handleEditEquipment(eq)}
                          className="text-slate-500 hover:text-teal-700 font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Specs
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(eq.id)}
                          className="text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- MODAL: ADD / EDIT SUPPLEMENT ---------------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={supModalOpen}
        onClose={() => setSupModalOpen(false)}
        title={editingSup ? "âœï¸ Edit Supplement Product" : "ðŸ›ï¸ Add New Supplement to Gym Store"}
      >
        <form onSubmit={handleSaveSupplement} className="space-y-4 text-slate-800">
          {/* Photo Capture / Upload */}
          <PhotoCaptureInput
            value={supForm.photoUrl}
            onChange={(url) => setSupForm({ ...supForm, photoUrl: url })}
            label="Product Bottle / Packaging Photo"
            subLabel="Capture live photo of product dabba or upload image"
            shape="rounded"
            aspectRatio="square"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Product Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Gold Standard 100% Whey"
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Brand / Manufacturer *</label>
              <input
                required
                type="text"
                placeholder="e.g. Optimum Nutrition / MuscleBlaze"
                value={supForm.brand}
                onChange={(e) => setSupForm({ ...supForm, brand: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={supForm.category}
                onChange={(e) => setSupForm({ ...supForm, category: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              >
                <option>Whey Protein</option>
                <option>Creatine</option>
                <option>Pre-Workout</option>
                <option>BCAA & EAA</option>
                <option>Vitamins & Fish Oil</option>
                <option>Mass Gainer</option>
                <option>Fat Burner</option>
                <option>Merchandise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Flavor</label>
              <input
                type="text"
                placeholder="e.g. Double Chocolate"
                value={supForm.flavor}
                onChange={(e) => setSupForm({ ...supForm, flavor: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Net Weight / Servings</label>
              <input
                type="text"
                placeholder="e.g. 2 kg (60 Servings)"
                value={supForm.weight}
                onChange={(e) => setSupForm({ ...supForm, weight: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
            <div>
              <label className="text-xs font-bold text-slate-700">Owner Purchase Cost (Rs.) *</label>
              <input
                required
                type="number"
                placeholder="Wholesale rate"
                value={supForm.purchaseCost}
                onChange={(e) => setSupForm({ ...supForm, purchaseCost: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Official MRP (Rs.)</label>
              <input
                type="number"
                placeholder="Box printed MRP"
                value={supForm.mrp}
                onChange={(e) => setSupForm({ ...supForm, mrp: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-800">Member Selling Price (Rs.) *</label>
              <input
                required
                type="number"
                placeholder="Final selling rate"
                value={supForm.sellingPrice}
                onChange={(e) => setSupForm({ ...supForm, sellingPrice: e.target.value })}
                className="w-full mt-1 bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 text-xs font-black text-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Current Stock (Qty)</label>
              <input
                required
                type="number"
                value={supForm.quantity}
                onChange={(e) => setSupForm({ ...supForm, quantity: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Low Stock Alert Limit</label>
              <input
                type="number"
                value={supForm.minThreshold}
                onChange={(e) => setSupForm({ ...supForm, minThreshold: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Product Highlights / Authenticity Note</label>
            <textarea
              rows={2}
              placeholder="e.g. 100% authentic with scratch verification code, imported from USA..."
              value={supForm.description}
              onChange={(e) => setSupForm({ ...supForm, description: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-md transition"
          >
            {editingSup ? "Update Supplement" : "Save Supplement Product"}
          </button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: POINT OF SALE (QUICK SELL) ------------------ */}
      {/* ========================================================================= */}
      <Modal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        title="âš¡ Point of Sale: Quick Supplement Sell"
      >
        {selectedProductForSale && (
          <form onSubmit={handleConfirmSale} className="space-y-4 text-slate-800">
            {/* Product Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              {selectedProductForSale.photoUrl ? (
                <img
                  src={selectedProductForSale.photoUrl}
                  alt={selectedProductForSale.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                  {selectedProductForSale.brand}
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate">{selectedProductForSale.name}</h4>
                <p className="text-[11px] text-slate-500">
                  Available in Stock:{" "}
                  <span className="font-bold text-slate-800">{selectedProductForSale.quantity} Units</span>
                </p>
              </div>
            </div>

            {/* Select Member / Buyer */}
            <div>
              <label className="text-xs font-bold text-slate-700">Select Member or Walk-in</label>
              <select
                value={sellForm.memberId}
                onChange={(e) => {
                  const mId = e.target.value;
                  const found = membersList.find((m) => m.id === mId);
                  if (found) {
                    setSellForm({
                      ...sellForm,
                      memberId: found.id,
                      memberName: found.name || found.fullName,
                      memberPhone: found.phone || found.whatsapp || ""
                    });
                  } else {
                    setSellForm({
                      ...sellForm,
                      memberId: "",
                      memberName: "Walk-in Customer",
                      memberPhone: ""
                    });
                  }
                }}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
              >
                <option value="">Walk-in Customer / Non-Member</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.fullName} ({m.phone || m.whatsapp || "No phone"})
                  </option>
                ))}
              </select>
            </div>

            {/* If Walk-in, allow typing name/phone */}
            {!sellForm.memberId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Buyer Name</label>
                  <input
                    type="text"
                    value={sellForm.memberName}
                    onChange={(e) => setSellForm({ ...sellForm, memberName: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={sellForm.memberPhone}
                    onChange={(e) => setSellForm({ ...sellForm, memberPhone: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Qty & Selling Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Quantity Sold</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={selectedProductForSale.quantity}
                  value={sellForm.quantity}
                  onChange={(e) => setSellForm({ ...sellForm, quantity: Number(e.target.value) })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Unit Price (Rs.)</label>
                <input
                  required
                  type="number"
                  value={sellForm.sellingPrice}
                  onChange={(e) => setSellForm({ ...sellForm, sellingPrice: Number(e.target.value) })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Total Bill & Payment Mode */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600">Total Payable Amount:</span>
                <span className="text-xl font-black text-emerald-700">
                  Rs. {(Number(sellForm.sellingPrice) * Number(sellForm.quantity)).toLocaleString("en-IN")}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {["Cash", "UPI", "Card", "Dues"].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setSellForm({ ...sellForm, paymentMode: mode })}
                      className={`py-1.5 rounded-xl text-xs font-bold transition ${
                        sellForm.paymentMode === mode
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-md transition hover:opacity-95"
            >
              Confirm Sale & Deduct Stock
            </button>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: ADD / EDIT EQUIPMENT FLEET ------------------ */}
      {/* ========================================================================= */}
      <Modal
        isOpen={eqModalOpen}
        onClose={() => setEqModalOpen(false)}
        title={editingEq ? "âœï¸ Edit Machine Specifications" : "ðŸ‹ï¸ Add Equipment to Gym Fleet"}
      >
        <form onSubmit={handleSaveEquipment} className="space-y-4 text-slate-800">
          {/* Photo Capture / Upload */}
          <PhotoCaptureInput
            value={eqForm.photoUrl}
            onChange={(url) => setEqForm({ ...eqForm, photoUrl: url })}
            label="Machine / Equipment Photo"
            subLabel="Capture live machine photo on gym floor or upload specs photo"
            shape="rounded"
            aspectRatio="wide"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Machine / Equipment Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Lat Pulldown / 20kg Dumbbell Pair"
                value={eqForm.name}
                onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Brand / Make</label>
              <input
                type="text"
                placeholder="e.g. Jerai Fitness / Being Strong"
                value={eqForm.brand}
                onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={eqForm.type}
                onChange={(e) => setEqForm({ ...eqForm, type: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              >
                <option>Heavy Machine</option>
                <option>Free Weights</option>
                <option>Cardio</option>
                <option>Accessories</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Quantity Units</label>
              <input
                required
                type="number"
                value={eqForm.quantity}
                onChange={(e) => setEqForm({ ...eqForm, quantity: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Current Condition</label>
              <select
                value={eqForm.condition}
                onChange={(e) => setEqForm({ ...eqForm, condition: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              >
                <option>Operational</option>
                <option>Needs Maintenance</option>
                <option>Under Breakdown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Weight & Engineering Specifications</label>
            <input
              type="text"
              placeholder="e.g. 100 kg weight stack, 5.5 HP AC motor, 14 Pairs dumbbell set"
              value={eqForm.weightSpecs}
              onChange={(e) => setEqForm({ ...eqForm, weightSpecs: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Investment & Vendor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/80">
            <div>
              <label className="text-xs font-bold text-slate-700">Purchase Date</label>
              <input
                type="date"
                value={eqForm.purchaseDate}
                onChange={(e) => setEqForm({ ...eqForm, purchaseDate: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Purchase Cost (Rs.)</label>
              <input
                type="number"
                placeholder="Total invoice cost"
                value={eqForm.purchasePrice}
                onChange={(e) => setEqForm({ ...eqForm, purchasePrice: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Vendor / Dealer Name</label>
              <input
                type="text"
                placeholder="e.g. Jerai India"
                value={eqForm.vendorName}
                onChange={(e) => setEqForm({ ...eqForm, vendorName: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Service Intervals */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Last Servicing Date</label>
              <input
                type="date"
                value={eqForm.lastServiceDate}
                onChange={(e) => setEqForm({ ...eqForm, lastServiceDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Service Interval (Days)</label>
              <input
                type="number"
                placeholder="e.g. 90 days for quarterly check"
                value={eqForm.serviceIntervalDays}
                onChange={(e) => setEqForm({ ...eqForm, serviceIntervalDays: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {!editingEq && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="autoExp"
                checked={eqForm.addPurchaseExpense}
                onChange={(e) => setEqForm({ ...eqForm, addPurchaseExpense: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300"
              />
              <label htmlFor="autoExp" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Auto-record this purchase in Gym Expenses Tracker as a Capital Asset
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-black text-sm shadow-md transition"
          >
            {editingEq ? "Update Equipment Specs" : "Add Equipment to Fleet"}
          </button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: LOG REPAIR / SERVICING ---------------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title="ðŸ”§ Log Machine Maintenance & Repair"
      >
        {selectedEqForService && (
          <form onSubmit={handleSaveRepairLog} className="space-y-4 text-slate-800">
            <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 text-xs">
              <span className="font-bold text-teal-900">Logging service for:</span>
              <h4 className="text-sm font-black text-teal-950 mt-0.5">{selectedEqForService.name}</h4>
              <p className="text-teal-700">
                Brand: {selectedEqForService.brand} â€¢ Type: {selectedEqForService.type}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Repair / Service Date *</label>
                <input
                  required
                  type="date"
                  value={repairForm.date}
                  onChange={(e) => setRepairForm({ ...repairForm, date: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Repair Cost Incurred (Rs.) *</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 1500"
                  value={repairForm.cost}
                  onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-extrabold focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Technician / Mechanic Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Mechanic"
                  value={repairForm.technician}
                  onChange={(e) => setRepairForm({ ...repairForm, technician: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Technician Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 9820011223"
                  value={repairForm.technicianPhone}
                  onChange={(e) => setRepairForm({ ...repairForm, technicianPhone: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Problem / Issue Solved *</label>
              <input
                required
                type="text"
                placeholder="e.g. Cable wire cut, motor overheating, pulley bearings replaced..."
                value={repairForm.issue}
                onChange={(e) => setRepairForm({ ...repairForm, issue: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Action & Parts Replaced</label>
              <textarea
                rows={2}
                placeholder="Details of new parts installed, greasing, belt tensioning done..."
                value={repairForm.actionTaken}
                onChange={(e) => setRepairForm({ ...repairForm, actionTaken: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Condition After Service</label>
                <select
                  value={repairForm.condition}
                  onChange={(e) => setRepairForm({ ...repairForm, condition: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option>Operational</option>
                  <option>Needs Maintenance</option>
                  <option>Under Breakdown</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <input
                  type="checkbox"
                  id="addExpPnl"
                  checked={repairForm.addExpenseToPnl}
                  onChange={(e) => setRepairForm({ ...repairForm, addExpenseToPnl: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300"
                />
                <label htmlFor="addExpPnl" className="ml-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  Sync repair cost to Gym Expense Tracker
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-black text-sm shadow-md transition"
            >
              Record Maintenance & Reset Service Due
            </button>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: VIEW SERVICE HISTORY TIMELINE --------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={serviceHistoryModalOpen}
        onClose={() => setServiceHistoryModalOpen(false)}
        title="ðŸ“œ Machine Maintenance & Service History"
      >
        {selectedEqForHistory && (
          <div className="space-y-4 text-slate-800">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-black text-slate-900">{selectedEqForHistory.name}</h4>
              <p className="text-xs text-slate-500">
                Purchased: {selectedEqForHistory.purchaseDate} for Rs.{" "}
                {Number(selectedEqForHistory.purchasePrice).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(!selectedEqForHistory.serviceHistory || selectedEqForHistory.serviceHistory.length === 0) ? (
                <div className="p-8 text-center text-slate-400">
                  <Wrench className="w-8 h-8 mx-auto stroke-1 mb-2" />
                  <p className="text-xs font-bold">No past service logs recorded yet.</p>
                  <p className="text-[11px]">Click "Log Repair / Service" whenever maintenance is performed.</p>
                </div>
              ) : (
                selectedEqForHistory.serviceHistory.map((log, index) => (
                  <div key={log.id || index} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" /> {log.date}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black border border-emerald-200">
                        Cost: Rs. {Number(log.cost).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">Issue: {log.issue}</p>
                    {log.actionTaken && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                        Action: {log.actionTaken}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Technician: {log.technician || "Self / Gym Staff"}</span>
                      {log.technicianPhone && <span>Phone: {log.technicianPhone}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
