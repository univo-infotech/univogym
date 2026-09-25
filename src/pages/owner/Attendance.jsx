import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Clock,
  Dumbbell,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Fingerprint,
  Scan,
  RefreshCw,
  Search,
  Plus,
  Play,
  Copy,
  Radio,
  ExternalLink,
  Sliders,
  Check,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../contexts/AuthContext";
import { getMembers } from "../../firebase/members";
import {
  getBiometricPunches,
  logBiometricPunch,
  getBiometricDevices,
  getLocalDevices,
  saveBiometricDevice,
  enrollMemberBiometric,
  toggleMemberBiometricAccess
} from "../../firebase/attendance";
import toast from "react-hot-toast";

export default function BiometricAttendance() {
  const { gymId } = useAuth();
  const currentGymId = gymId || "univo_main";

  // Navigation Tabs: "live" | "simulator" | "enrollment" | "devices"
  const [activeTab, setActiveTab] = useState("live");

  const [members, setMembers] = useState([]);
  const [punches, setPunches] = useState([]);
  const [devices, setDevices] = useState(() => getLocalDevices());
  const [loading, setLoading] = useState(true);
  const [searchMember, setSearchMember] = useState("");
  const [enrollModalMember, setEnrollModalMember] = useState(null);
  const [enrollBiometricId, setEnrollBiometricId] = useState("");
  const [enrollType, setEnrollType] = useState("fingerprint");

  // Simulator state
  const [simSelectedMemberId, setSimSelectedMemberId] = useState("");
  const [simSelectedDevice, setSimSelectedDevice] = useState(devices[0]?.id || "dev_main_entrance");
  const [simLastResult, setSimLastResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, pList, dList] = await Promise.all([
        getMembers(currentGymId),
        getBiometricPunches(currentGymId, 50),
        getBiometricDevices(currentGymId)
      ]);
      setMembers(mList || []);
      setPunches(pList || []);
      if (dList && dList.length > 0) setDevices(dList);
      if (mList && mList.length > 0 && !simSelectedMemberId) {
        setSimSelectedMemberId(mList[0].id);
      }
    } catch (e) {
      console.warn("Error loading biometric data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentGymId]);

  // Real-time Punch Stream Listener
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const freshPunches = await getBiometricPunches(currentGymId, 50);
        setPunches(freshPunches);
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [currentGymId]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const todayPunches = punches.filter(p => p.date === todayStr || !p.date);
    const granted = todayPunches.filter(p => p.status === "granted");
    const denied = todayPunches.filter(p => p.status === "denied");
    const uniqueMembers = new Set(granted.map(p => p.memberId)).size;
    const enrolledCount = members.filter(m => m.biometricEnrolled || m.biometricId).length;

    return {
      todayTotal: todayPunches.length,
      grantedCount: granted.length,
      deniedCount: denied.length,
      uniqueAthletes: uniqueMembers,
      enrolledAthletes: enrolledCount,
      totalAthletes: members.length
    };
  }, [punches, members]);

  // Handle Practical Punch Simulator
  const handleSimulatePunch = async (e) => {
    if (e) e.preventDefault();
    if (!simSelectedMemberId) {
      toast.error("Please select a member to simulate punch");
      return;
    }

    setSimulating(true);
    try {
      const targetDev = devices.find(d => d.id === simSelectedDevice) || devices[0];
      const result = await logBiometricPunch(currentGymId, {
        memberId: simSelectedMemberId,
        deviceId: targetDev.id,
        deviceName: targetDev.name
      });

      setSimLastResult(result);
      if (result.status === "granted") {
        toast.success(`🟢 ACCESS GRANTED! Gate opened for ${result.member?.name || "Member"}`);
      } else {
        toast.error(`🛑 ACCESS DENIED! ${result.reason}`);
      }

      // Refresh punch list
      const fresh = await getBiometricPunches(currentGymId, 50);
      setPunches(fresh);
    } catch (err) {
      toast.error("Simulation error");
    } finally {
      setSimulating(false);
    }
  };

  // Handle Save Enrollment
  const handleSaveEnrollment = async (e) => {
    e.preventDefault();
    if (!enrollModalMember || !enrollBiometricId.trim()) {
      toast.error("Please enter a numeric Biometric / Machine ID");
      return;
    }

    try {
      await enrollMemberBiometric(currentGymId, enrollModalMember.id, enrollBiometricId.trim(), enrollType);
      setMembers(prev =>
        prev.map(m =>
          m.id === enrollModalMember.id
            ? {
                ...m,
                biometricId: enrollBiometricId.trim(),
                biometricEnrolled: true,
                biometricType: enrollType,
                biometricAccess: true
              }
            : m
        )
      );
      toast.success(`Biometric ID #${enrollBiometricId.trim()} enrolled for ${enrollModalMember.name || "Member"}! ✨`);
      setEnrollModalMember(null);
    } catch (err) {
      toast.error("Failed to enroll biometric");
    }
  };

  // Toggle Member Biometric Access Lock
  const handleToggleAccess = async (m) => {
    const nextAccess = m.biometricAccess === false ? true : false;
    try {
      await toggleMemberBiometricAccess(currentGymId, m.id, nextAccess);
      setMembers(prev =>
        prev.map(item => item.id === m.id ? { ...item, biometricAccess: nextAccess } : item)
      );
      toast.success(nextAccess ? `Biometric unlocked for ${m.name}` : `Biometric gate access locked for ${m.name}`);
    } catch (e) {
      toast.error("Failed to update access switch");
    }
  };

  // Filtered members for enrollment tab
  const filteredEnrollMembers = useMemo(() => {
    return members.filter(m => {
      const q = searchMember.toLowerCase();
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q) ||
        String(m.biometricId || "").toLowerCase().includes(q) ||
        (m.planName || "").toLowerCase().includes(q)
      );
    });
  }, [members, searchMember]);

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Scan className="w-7 h-7 text-emerald-600" />
              Biometric Attendance & Access Control
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Hardware Cloud Sync Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Universal integration for ZKTeco, Realtime, e-SSL & Hikvision machines with live fee expiry locking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<Play className="w-4 h-4 text-emerald-200" />}
            onClick={() => setActiveTab("simulator")}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 shadow-sm"
          >
            🧪 Test Punch Simulator
          </Button>
          <Button
            icon={<RefreshCw className="w-4 h-4 text-slate-600" />}
            onClick={loadData}
            variant="outline"
            className="text-xs py-2.5 px-3"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ============================================================
          KPI SUMMARY METRIC CARDS
      ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today Punches Logged"
          value={stats.todayTotal}
          change={`${stats.uniqueAthletes} unique members`}
          changeType="up"
          icon={<Clock className="w-5 h-5 text-emerald-600" />}
          color="green"
        />
        <StatCard
          title="Access Granted"
          value={stats.grantedCount}
          change="Gate unlocked & streak saved"
          changeType="up"
          icon={<CheckCircle2 className="w-5 h-5 text-teal-600" />}
          color="teal"
        />
        <StatCard
          title="Denied (Fee Due / Expired)"
          value={stats.deniedCount}
          change={stats.deniedCount > 0 ? "Blocked at entrance" : "Zero blockages"}
          changeType={stats.deniedCount > 0 ? "down" : "up"}
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
          color="red"
        />
        <StatCard
          title="Athletes Enrolled"
          value={`${stats.enrolledAthletes} / ${stats.totalAthletes}`}
          change={`${Math.round((stats.enrolledAthletes / (stats.totalAthletes || 1)) * 100)}% coverage`}
          changeType="up"
          icon={<Fingerprint className="w-5 h-5 text-indigo-600" />}
          color="blue"
        />
      </div>

      {/* ============================================================
          MAIN NAVIGATION TABS
      ============================================================ */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-px">
        {[
          { id: "live", label: "🔴 Live Gate Feed (Real-Time)", icon: Radio, count: punches.length },
          { id: "simulator", label: "🧪 Practical Punch Simulator", icon: Play },
          { id: "enrollment", label: "👥 Member Biometric IDs & Lock", icon: Users, count: members.length },
          { id: "devices", label: "⚙️ Hardware Setup (ZKTeco / Realtime)", icon: Sliders, count: devices.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-black transition whitespace-nowrap ${
                isActive
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB 1: LIVE GATE FEED (REAL-TIME BIOMETRIC STREAM)
      ============================================================ */}
      {activeTab === "live" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Live Entrance Feed</h3>
                <p className="text-xs text-slate-500">
                  Every fingerprint or facial scan triggers real-time fee check, gate unlock signal and attendance log.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Listening to Cloud Webhooks
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">Loading punch logs...</div>
          ) : punches.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Fingerprint className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Biometric Punches Yet Today</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                When members place their thumb or scan their face at your gym entrance machine, their punch will appear here instantly.
              </p>
              <Button
                onClick={() => setActiveTab("simulator")}
                className="mt-2 bg-emerald-600 text-white text-xs font-bold"
              >
                Try Punch Simulator Now →
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {punches.map(p => {
                const isGranted = p.status === "granted";
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition shadow-2xs flex flex-col justify-between space-y-3 ${
                      isGranted
                        ? "bg-white border-slate-200 hover:border-emerald-300"
                        : "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt={p.memberName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className={`w-11 h-11 rounded-xl font-black text-sm flex items-center justify-center text-white ${
                              isGranted ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-rose-500 to-red-600"
                            }`}>
                              {(p.memberName || "M").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                              {p.memberName}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              ID: #{p.biometricId || "N/A"} • {p.phone || "No phone"}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border ${
                          isGranted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        }`}>
                          {isGranted ? "ACCESS GRANTED 🟢" : "ACCESS DENIED 🛑"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Plan / Status:</span>
                          <strong className="text-slate-800 truncate max-w-[170px]">{p.planName}</strong>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Workout Shift:</span>
                          <strong className="text-slate-700">{p.slot || "General Shift"}</strong>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Device Location:</span>
                          <strong className="text-slate-700">{p.deviceName || "Entrance Gate"}</strong>
                        </div>
                      </div>

                      {!isGranted && (
                        <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{p.reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-600">
                        <Clock className="w-3 h-3 text-emerald-600" /> {p.time || "Just now"}
                      </span>
                      <span>{p.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: PRACTICAL PUNCH SIMULATOR (TEST LIVE IN BROWSER)
      ============================================================ */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                PRACTICAL TESTING BENCH
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Simulate Biometric Machine Punch
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Test right now from your screen! Select any gym member to see how the biometric software verifies their fee, plan expiry, marks attendance, or triggers gate lock denial.
              </p>
            </div>

            <form onSubmit={handleSimulatePunch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Select Gym Member
                </label>
                <select
                  value={simSelectedMemberId}
                  onChange={(e) => setSimSelectedMemberId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.fullName} (ID #{m.biometricId || "N/A"}) • Plan: {m.planName || "General"} • {m.status?.toUpperCase() || "ACTIVE"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Select Biometric Terminal / Gate
                </label>
                <select
                  value={simSelectedDevice}
                  onChange={(e) => setSimSelectedDevice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.brand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">What happens on this punch?</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Checks if member plan is active or expired.</li>
                  <li>Checks if member has unpaid overdue balance.</li>
                  <li>If active: Marks attendance today + increments streak.</li>
                  <li>If expired/left: Blocks gate and logs reason.</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={simulating}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20"
              >
                {simulating ? "Scanning Thumb..." : "🖐️ Scan Fingerprint Now (Simulate Punch)"}
              </Button>
            </form>
          </div>

          {/* Machine Screen Preview */}
          <div className="lg:col-span-6 flex flex-col justify-center items-center p-8 rounded-3xl bg-slate-950 border-4 border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-400">
              <Fingerprint className="w-9 h-9 animate-pulse text-emerald-400" />
            </div>

            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                BIOMETRIC TERMINAL LCD DISPLAY
              </p>
              <h4 className="text-xl font-mono font-black text-white mt-1">
                {simLastResult ? (
                  simLastResult.status === "granted" ? (
                    <span className="text-emerald-400">🟢 ACCESS GRANTED</span>
                  ) : (
                    <span className="text-rose-400">🛑 ACCESS DENIED</span>
                  )
                ) : (
                  <span className="text-slate-500">READY FOR PUNCH</span>
                )}
              </h4>
            </div>

            {simLastResult ? (
              <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>MEMBER:</span>
                  <strong className="text-white">{simLastResult.member?.name}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>BIO ID:</span>
                  <strong className="text-emerald-400">#{simLastResult.punch.biometricId}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PLAN:</span>
                  <strong className="text-slate-300">{simLastResult.member?.planName}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>TIME:</span>
                  <strong className="text-slate-300">{simLastResult.punch.time}</strong>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">REASON / ALERT:</span>
                  <p className={`mt-0.5 font-bold ${simLastResult.status === "granted" ? "text-emerald-400" : "text-rose-400"}`}>
                    {simLastResult.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">
                Click "Scan Fingerprint Now" to see live terminal readout.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: MEMBER BIOMETRIC ENROLLMENT & LOCK MANAGEMENT
      ============================================================ */}
      {activeTab === "enrollment" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Member Biometric IDs & Gate Access Control
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign numeric Machine IDs (#101, #102) and instantly lock/unlock door access.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member, phone, or bio ID..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Biometric ID</th>
                  <th className="py-3 px-4">Gym Plan & Validity</th>
                  <th className="py-3 px-4">Thumb/Face Status</th>
                  <th className="py-3 px-4 text-center">Gate Permission</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEnrollMembers.map((m, idx) => {
                  const bioId = m.biometricId || m.machineId || `10${idx + 1}`;
                  const isEnrolled = !!m.biometricEnrolled || !!m.biometricId;
                  const isAccessAllowed = m.biometricAccess !== false;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{m.name || m.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.phone || "No phone"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          #{bioId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{m.planName || "General Plan"}</div>
                        <div className="text-[11px] text-slate-500">Exp: {m.expiryDate || "Ongoing"}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Thumb Enrolled ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Not Scanned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(m)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition border ${
                            isAccessAllowed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                          }`}
                          title="Click to toggle gate access"
                        >
                          {isAccessAllowed ? (
                            <>
                              <Unlock className="w-3 h-3" /> Unlocked
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" /> Blocked
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollModalMember(m);
                            setEnrollBiometricId(bioId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-600 transition flex items-center gap-1 ml-auto"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>{isEnrolled ? "Edit Code" : "Enroll Thumb"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: HARDWARE SETUP & MULTI-GYM CONNECT INSTRUCTIONS
      ============================================================ */}
      {activeTab === "devices" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Universal Biometric Gateway Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use these credentials to connect any biometric machine in your gym without changing your PC or hardware.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                Plug & Play Cloud Push
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cloud Server Webhook URL
                </span>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-slate-900 truncate">
                    {window.location.origin}/api/biometric/push
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/biometric/push`);
                      toast.success("Webhook URL copied!");
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Paste this in machine menu: <code>Comm. -&gt; Cloud Server / Web Server</code>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Gym Secret Token / Device Key
                </span>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-emerald-700">
                    UNIVO_BIO_9921_MAIN
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("UNIVO_BIO_9921_MAIN");
                      toast.success("Gym Secret Token copied!");
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Copy Token"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Unique authentication key identifying punches from your gym facility.
                </p>
              </div>
            </div>
          </div>

          {/* Machine Connection Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guide 1: ZKTeco / e-SSL */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 font-black text-sm flex items-center justify-center">
                  ZK
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">ZKTeco & e-SSL Machines</h4>
                  <p className="text-[11px] text-slate-500">Models: K90, e990, MB20, uFace, SilkBio</p>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>Machine ka <strong>Menu</strong> dabayein aur <strong>Comm.</strong> par jayein.</li>
                <li><strong>Cloud Server Setting / ADMS</strong> select karein.</li>
                <li>Server URL mein upar diya gaya link daalein aur Port <code>80</code> ya <code>443</code> set karein.</li>
                <li>Machine ko WiFi ya LAN se connect karein. Screen par Cloud icon green ho jayega!</li>
              </ol>
            </div>

            {/* Guide 2: Realtime Biometrics */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 font-black text-sm flex items-center justify-center">
                  RT
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Realtime Biometrics</h4>
                  <p className="text-[11px] text-slate-500">Models: T52, C101, RS Series, BioEnable</p>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>Machine ke <strong>Network Settings</strong> mein jayein.</li>
                <li><strong>HTTP Push / Webhook</strong> enable karein.</li>
                <li>Host address mein Univo Webhook URL daalein.</li>
                <li>Save karein. Realtime automatic live punches Univo ko push karega.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ENROLL MEMBER BIOMETRIC ID MODAL
      ============================================================ */}
      {enrollModalMember && (
        <Modal
          isOpen={true}
          onClose={() => setEnrollModalMember(null)}
          title={`🖐️ Enroll Biometric ID: ${enrollModalMember.name || "Member"}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEnrollment} className="space-y-4 text-slate-800">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Fingerprint className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{enrollModalMember.name || "Member"}</h4>
                <p className="text-[11px] text-slate-500">
                  Plan: {enrollModalMember.planName || "General Plan"} • Phone: {enrollModalMember.phone || "N/A"}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Biometric Machine ID (User Code on Machine)
              </label>
              <input
                type="text"
                placeholder="e.g. 101, 102, 103..."
                value={enrollBiometricId}
                onChange={(e) => setEnrollBiometricId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                autoFocus
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enter the exact ID code registered for this member on the physical biometric scanner.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Biometric Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEnrollType("fingerprint")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    enrollType === "fingerprint"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Fingerprint (Thumb)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollType("face")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    enrollType === "face"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Scan className="w-4 h-4" />
                  <span>Facial Scan</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEnrollModalMember(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                Save Biometric ID
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
