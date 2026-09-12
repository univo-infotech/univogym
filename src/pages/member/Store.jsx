import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldCheck,
  Zap,
  Sparkles,
  Phone,
  MessageSquare,
  Check,
  Flame,
  ArrowRight
} from "lucide-react";
import { getSupplements } from "../../firebase/stock";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const DEFAULT_SUPPLEMENTS = [
  {
    id: "sup_1",
    name: "Optimum Nutrition Gold Standard 100% Whey (5 lbs)",
    brand: "Optimum Nutrition",
    category: "Whey Protein",
    flavor: "Double Rich Chocolate",
    weight: "2.27 kg",
    mrp: 7899,
    sellingPrice: 6699,
    quantity: 14,
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
    mrp: 1199,
    sellingPrice: 899,
    quantity: 26,
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
    mrp: 2999,
    sellingPrice: 2399,
    quantity: 3,
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
    mrp: 699,
    sellingPrice: 499,
    quantity: 38,
    photoUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    description: "Double-walled insulated leak-proof protein shaker with blender ball wire.",
    inStock: true
  }
];

export default function MemberStore() {
  const { gymId: currentGymId, user } = useAuth();
  const gymId = currentGymId || "univo_main";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const sups = await getSupplements(gymId);
        setProducts(sups && sups.length > 0 ? sups : DEFAULT_SUPPLEMENTS);
      } catch (err) {
        setProducts(DEFAULT_SUPPLEMENTS);
      }
    }
    load();
  }, [gymId]);

  const handleWhatsAppOrder = (product) => {
    const memberName = user?.displayName || "Gym Member";
    const text = `Hello Gym Team! 👋\n\nI am interested in buying from the Gym Store:\n\n*Product:* ${product.name}\n*Brand:* ${product.brand}\n*Special Price:* Rs. ${Number(product.sellingPrice).toLocaleString("en-IN")}\n\nPlease keep one unit reserved for me at the reception counter.\n\nThanks! - ${memberName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 backdrop-blur-md text-emerald-200 text-xs font-bold mb-3 border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-300" /> 100% Authentic & Certified Supplements
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Gym Store & Nutrition Bar
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
            Exclusive discounted member rates on genuine whey proteins, creatine, pre-workouts, and workout essentials. Available directly at your gym reception counter.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search protein, creatine, brand..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["all", "Whey Protein", "Creatine", "Pre-Workout", "BCAA & EAA", "Merchandise"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                category === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((item) => {
          const inStock = Number(item.quantity) > 0;
          const discount = item.mrp > 0 ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100) : 0;

          return (
            <div
              key={item.id}
              className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden flex flex-col hover:border-emerald-300 transition-all group"
            >
              {/* Product Photo */}
              <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 stroke-1" />
                    <span className="text-[11px] font-semibold mt-1">Genuine Stock</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-md flex items-center gap-1 ${
                      inStock ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {inStock ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {inStock ? "Available in Gym" : "Out of Stock"}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-current" /> {discount}% OFF
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider text-emerald-700 font-extrabold">
                      {item.brand}
                    </span>
                    <span>{item.category}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug line-clamp-2">
                    {item.name}
                  </h3>

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

                  {item.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Pricing */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
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
                    <span className="text-[10px] text-emerald-600 font-bold">Member Privilege Price</span>
                  </div>
                </div>

                {/* Instant Order via Reception / WhatsApp */}
                <button
                  onClick={() => handleWhatsAppOrder(item)}
                  disabled={!inStock}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
                    inStock
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Reserve at Reception Counter</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}