import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Dumbbell,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Flame,
  Check,
  X,
  ChevronRight,
  Sun,
  Sunset,
  Sunrise,
  Activity,
  AlertCircle
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../contexts/AuthContext";
import { getMembers, updateMember } from "../../firebase/members";
import { 
  getGymAttendance, 
  markMemberAttendance, 
  deleteMemberAttendance 
} from "../../firebase/attendance";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/dateUtils";

export default function Attendance() {
  const { gymId } = useAuth();
  const currentGymId = gymId || "univo_main";

  // Navigation Tabs: "present" (Checked in) | "quick_mark" (All members ready to check in)
  const getTodayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const [activeTab, setActiveTab] = useState("present");

  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(getTodayIso);
  const [quickCheckInModalOpen, setQuickCheckInModalOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Load attendance data for selected date
  const loadData = async () => {
    setLoading(true);
    try {
      const targetDate = new Date(selectedDate);
      const [mList, attList] = await Promise.all([
        getMembers(currentGymId),
        getGymAttendance(currentGymId, targetDate)
      ]);
      setMembers(mList || []);
      setAttendanceRecords(attList || []);
    } catch (e) {
      console.warn("Error loading attendance data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentGymId, selectedDate]);

  // Merge attendance records with member details
  const checkedInList = useMemo(() => {
    const membersMap = {};
    members.forEach(m => {
      membersMap[m.id] = m;
    });

    const isSelectedDateToday = selectedDate === getTodayIso();

    // Firestore attendance collection records
    return attendanceRecords.map(att => {
      const member = membersMap[att.memberId] || {};
      const recordDate = att.date?.toDate ? att.date.toDate() : new Date(att.date || att.createdAt);
      const timeStr = recordDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      return {
        id: att.id,
        memberId: att.memberId,
        memberName: member.name || member.fullName || att.memberName || "Athlete",
        phone: member.phone || att.phone || "",
        planName: member.planName || "General Plan",
        slot: member.slot || member.workoutSlot || "General Shift",
        photoURL: member.photoURL || member.photoUrl || member.photo || null,
        streak: member.attendanceStreak || 1,
        time: timeStr,
        recordDate,
        expiryDate: member.expiryDate || null,
        isAttendanceDoc: true
      };
    });
  }, [attendanceRecords, members]);

  // Checked in member IDs set
  const checkedInMemberIds = useMemo(() => {
    return new Set(checkedInList.map(item => item.memberId));
  }, [checkedInList]);

  // Filter checked in list
  const filteredCheckedIn = useMemo(() => {
    return checkedInList.filter(item => {
      const matchesSearch =
        (item.memberName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.phone || "").includes(searchQuery);

      const matchesShift =
        shiftFilter === "all" ||
        (item.slot || "").toLowerCase().includes(shiftFilter.toLowerCase());

      return matchesSearch && matchesShift;
    });
  }, [checkedInList, searchQuery, shiftFilter]);

  // All active members ready to check in
  const pendingCheckInMembers = useMemo(() => {
    return members
      .filter(m => m.status !== "left" && m.status !== "ended")
      .filter(m => {
        const matchesSearch =
          (m.name || m.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.phone || "").includes(searchQuery);

        const matchesShift =
          shiftFilter === "all" ||
          (m.slot || m.workoutSlot || "").toLowerCase().includes(shiftFilter.toLowerCase());

        return matchesSearch && matchesShift;
      });
  }, [members, searchQuery, shiftFilter]);

  // Quick search candidates for modal
  const quickSearchMembers = useMemo(() => {
    if (!quickSearch.trim()) return members.slice(0, 8);
    const q = quickSearch.toLowerCase();
    return members.filter(m => 
      (m.name || m.fullName || "").toLowerCase().includes(q) ||
      (m.phone || "").includes(q)
    );
  }, [members, quickSearch]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalToday = checkedInList.length;
    const activeMembersCount = members.filter(m => m.status !== "left" && m.status !== "ended").length;
    const morningCount = checkedInList.filter(item => (item.slot || "").toLowerCase().includes("morning")).length;
    const eveningCount = checkedInList.filter(item => (item.slot || "").toLowerCase().includes("evening")).length;

    return {
      totalToday,
      activeMembersCount,
      morningCount,
      eveningCount
    };
  }, [checkedInList, members]);

  // Handle Mark Attendance
  const handleMarkPresent = async (member) => {
    if (!member) return;
    setProcessingId(member.id);

    try {
      const now = new Date();
      await markMemberAttendance(member.id, currentGymId, now);

      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

      await updateMember(currentGymId, member.id, {
        lastCheckIn: now.toISOString(),
        lastCheckInDate: dateStr,
        lastCheckInTime: timeStr,
        attendanceStreak: (member.attendanceStreak || 0) + 1
      });

      toast.success(`Check-in recorded for ${member.name || member.fullName || "Athlete"}! 🏋️`, {
        icon: "✅"
      });

      await loadData();
    } catch (err) {
      console.error("Mark attendance error:", err);
      toast.error("Failed to record check-in");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Remove Attendance
  const handleRemoveAttendance = async (item) => {
    if (!window.confirm(`Undo attendance check-in for ${item.memberName}?`)) return;
    setProcessingId(item.id);

    try {
      if (item.isAttendanceDoc) {
        await deleteMemberAttendance(item.id);
      }
      toast.success("Attendance check-in undone.");
      await loadData();
    } catch (err) {
      console.error("Delete attendance error:", err);
      toast.error("Failed to undo check-in");
    } finally {
      setProcessingId(null);
    }
  };

  const getSlotIcon = (slot) => {
    const s = (slot || "").toLowerCase();
    if (s.includes("morning")) return <Sunrise className="w-3.5 h-3.5 text-amber-500" />;
    if (s.includes("evening")) return <Sunset className="w-3.5 h-3.5 text-indigo-500" />;
    return <Sun className="w-3.5 h-3.5 text-emerald-500" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-emerald-600" />
              Member Attendance & Check-in
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Check-in System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track daily gym presence, record check-ins with 1 click, and manage member attendance streaks
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            icon={<Plus className="w-4 h-4 text-emerald-200" />}
            onClick={() => setQuickCheckInModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 shadow-sm"
          >
            + Quick Check-in
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
          KPI SUMMARY STAT CARDS
      ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Check-ins"
          value={stats.totalToday}
          change={`${stats.totalToday} athletes attended`}
          changeType="up"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          color="green"
        />
        <StatCard
          title="Morning Shift"
          value={stats.morningCount}
          change="Early training athletes"
          changeType="up"
          icon={<Sunrise className="w-5 h-5 text-amber-500" />}
          color="amber"
        />
        <StatCard
          title="Evening Shift"
          value={stats.eveningCount}
          change="Afternoon & evening batch"
          changeType="up"
          icon={<Sunset className="w-5 h-5 text-indigo-500" />}
          color="blue"
        />
        <StatCard
          title="Active Gym Members"
          value={stats.activeMembersCount}
          change={`${Math.round((stats.totalToday / (stats.activeMembersCount || 1)) * 100)}% attendance today`}
          changeType="up"
          icon={<Users className="w-5 h-5 text-teal-600" />}
          color="teal"
        />
      </div>

      {/* ============================================================
          DATE SELECTOR & FILTERS ROW
      ============================================================ */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-slate-400" /> Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {selectedDate !== getTodayIso() && (
            <button
              onClick={() => setSelectedDate(getTodayIso())}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200"
            >
              Today
            </button>
          )}
        </div>

        {/* Search & Shift Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search athlete by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white"
          >
            <option value="all">All Shifts</option>
            <option value="morning">Morning Shift</option>
            <option value="evening">Evening Shift</option>
            <option value="general">General Shift</option>
          </select>
        </div>
      </div>

      {/* ============================================================
          MAIN NAVIGATION TABS
      ============================================================ */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("present")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-black transition whitespace-nowrap ${
            activeTab === "present"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${activeTab === "present" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>Checked-In Athletes</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "present" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {checkedInList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quick_mark")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-black transition whitespace-nowrap ${
            activeTab === "quick_mark"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "quick_mark" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>All Members Directory & Mark Present</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "quick_mark" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {members.length}
          </span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: CHECKED-IN ATHLETES
      ============================================================ */}
      {activeTab === "present" && (
        <div className="space-y-4">
          {filteredCheckedIn.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                No Check-ins Found for {formatDate(selectedDate)}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No member attendance was recorded on this date yet. Use "+ Quick Check-in" above or the member list to record athlete check-ins.
              </p>
              <button
                onClick={() => setQuickCheckInModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Check In an Athlete Now
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Membership Plan</th>
                      <th className="py-3 px-4">Workout Shift</th>
                      <th className="py-3 px-4">Check-in Time</th>
                      <th className="py-3 px-4">Streak</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCheckedIn.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        {/* Member */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.photoURL ? (
                              <img
                                src={item.photoURL}
                                alt={item.memberName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
                                {item.memberName?.[0] || "A"}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-900">{item.memberName}</div>
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                <Check className="w-3 h-3 text-emerald-600" /> Present
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4">
                          {item.phone ? (
                            <a
                              href={`tel:${item.phone.replace(/[^0-9+]/g, "")}`}
                              className="text-slate-600 hover:text-emerald-600 hover:underline inline-flex items-center gap-1 font-mono cursor-pointer"
                              title={`Call ${item.memberName} (${item.phone})`}
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{item.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">No phone</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{item.planName}</div>
                          {item.expiryDate && (
                            <div className="text-[10px] text-slate-400">Exp: {formatDate(item.expiryDate)}</div>
                          )}
                        </td>

                        {/* Shift */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[11px]">
                            {getSlotIcon(item.slot)}
                            <span>{item.slot}</span>
                          </div>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {item.time}
                        </td>

                        {/* Streak */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-extrabold text-[10px]">
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{item.streak || 1} Days</span>
                          </span>
                        </td>

                        {/* Undo Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveAttendance(item)}
                            disabled={processingId === item.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Undo / remove this check-in"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: ALL MEMBERS DIRECTORY & MARK PRESENT
      ============================================================ */}
      {activeTab === "quick_mark" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Athlete Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Membership Plan</th>
                  <th className="py-3 px-4">Workout Shift</th>
                  <th className="py-3 px-4">Today's Status</th>
                  <th className="py-3 px-4 text-right">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingCheckInMembers.map((m) => {
                  const isCheckedIn = checkedInMemberIds.has(m.id);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {m.photoURL || m.photoUrl ? (
                            <img
                              src={m.photoURL || m.photoUrl}
                              alt={m.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                              {(m.name || m.fullName || "A")[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900">{m.name || m.fullName}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{m.gender || "Member"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {m.phone ? (
                          <a
                            href={`tel:${m.phone.replace(/[^0-9+]/g, "")}`}
                            className="text-slate-600 hover:text-emerald-600 hover:underline inline-flex items-center gap-1 font-mono cursor-pointer"
                            title={`Call ${m.name || m.fullName} (${m.phone})`}
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{m.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">No phone</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{m.planName || "General Plan"}</div>
                        <div className="text-[10px] text-slate-400">Exp: {formatDate(m.expiryDate) || "Ongoing"}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[11px]">
                          {getSlotIcon(m.slot || m.workoutSlot)}
                          <span>{m.slot || m.workoutSlot || "General"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checked-In Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px]">
                            Not Yet Checked-In
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isCheckedIn ? (
                          <span className="text-xs text-emerald-700 font-bold px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-200">
                            ✅ Present
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkPresent(m)}
                            disabled={processingId === m.id}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                          >
                            {processingId === m.id ? "Marking..." : "✅ Mark Present"}
                          </button>
                        )}
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
          QUICK CHECK-IN SEARCH MODAL
      ============================================================ */}
      {quickCheckInModalOpen && (
        <Modal
          isOpen={quickCheckInModalOpen}
          onClose={() => setQuickCheckInModalOpen(false)}
          size="md"
        >
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Quick Athlete Check-in
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Search any member by name or mobile number to record their presence today
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Type member name or phone..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 -mx-2 px-2">
              {quickSearchMembers.map((m) => {
                const isChecked = checkedInMemberIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl px-2 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {(m.name || m.fullName || "A")[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {m.name || m.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {m.phone || "No phone"} • {m.planName || "General Plan"}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isChecked ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Checked-In ✅
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            handleMarkPresent(m);
                            setQuickCheckInModalOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setQuickCheckInModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
