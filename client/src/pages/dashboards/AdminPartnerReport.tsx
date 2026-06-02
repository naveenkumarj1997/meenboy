import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getDeliveryPartners, getAllAssignments } from "../../lib/api";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

export default function AdminPartnerReport() {
  const { token } = useAuth();
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportPartnerId, setReportPartnerId] = useState("");

  useEffect(() => {
    if (!token) return;
    
    // Initial fetch
    fetchAllData();

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      
      const [partRes, assignRes] = await Promise.all([
        getDeliveryPartners(token!),
        getAllAssignments(token!)
      ]);
      
      setPartners(partRes.deliveryPartners);
      setAssignments(assignRes.assignments);
      
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load report data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Partner Daily Report" description="Loading report..." navLinks={ADMIN_NAV_LINKS}>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const localTodayStr = `${year}-${month}-${day}`;

  const partnerAssignments = reportPartnerId ? assignments.filter(a => 
    a.deliveryPartner?._id === reportPartnerId && 
    a.order?.deliveryDate === localTodayStr
  ) : [];

  const completed = partnerAssignments.filter(a => a.status === 'delivered');
  const ongoing = partnerAssignments.filter(a => ['en_route', 'picked_up'].includes(a.status));
  const notDelivered = partnerAssignments.filter(a => ['pending', 'assigned'].includes(a.status));
  const failed = partnerAssignments.filter(a => a.status === 'failed');

  const totalCod = completed.filter(a => a.paymentMethod === 'cash').reduce((sum, a) => sum + (a.paymentCollected || 0), 0);
  const totalUpi = completed.filter(a => a.paymentMethod === 'upi').reduce((sum, a) => sum + (a.paymentCollected || 0), 0);
  const totalNotPaid = partnerAssignments.filter(a => a.status !== 'delivered').reduce((sum, a) => sum + (a.order?.total || 0), 0);

  return (
    <DashboardShell
      title="Partner Daily Report"
      description="View daily delivery status and collections by partner."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

      <div className="mb-8">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
           <div className="mb-6">
             <label className="block text-slate-400 text-sm mb-2">Select Delivery Partner</label>
             <select 
               className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 w-full md:w-72"
               value={reportPartnerId}
               onChange={(e) => setReportPartnerId(e.target.value)}
             >
                <option value="">-- Select Partner --</option>
                {partners.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
             </select>
           </div>
           
           {reportPartnerId ? (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                     <div className="text-emerald-400 text-xs font-bold uppercase mb-1">Total COD Collected</div>
                     <div className="text-2xl font-black text-emerald-400">₹{totalCod.toFixed(2)}</div>
                   </div>
                   <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                     <div className="text-blue-400 text-xs font-bold uppercase mb-1">Total UPI Collected</div>
                     <div className="text-2xl font-black text-blue-400">₹{totalUpi.toFixed(2)}</div>
                   </div>
                   <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                     <div className="text-rose-400 text-xs font-bold uppercase mb-1">Pending Collection</div>
                     <div className="text-2xl font-black text-rose-400">₹{totalNotPaid.toFixed(2)}</div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Today's Deliveries ({localTodayStr})</h3>
                   
                   {partnerAssignments.length === 0 ? (
                     <div className="text-slate-400 py-4">No deliveries assigned for today.</div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                       {/* Column: Not Delivered */}
                       <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                           <span>Not Delivered</span>
                           <span className="bg-slate-800 px-2 py-0.5 rounded-full">{notDelivered.length}</span>
                         </div>
                         <div className="flex flex-col gap-3">
                           {notDelivered.map(a => (
                             <div key={a._id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                               <div className="flex justify-between items-start mb-2">
                                 <div>
                                   <div className="font-bold text-white text-sm">#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</div>
                                   <div className="text-[11px] text-slate-400">{a.order?.customer?.name || 'Guest'}</div>
                                 </div>
                                 <div className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 uppercase">{a.order?.deliveryTime}</div>
                               </div>
                               <div className="flex justify-between items-end pt-2 border-t border-slate-700/50">
                                 <span className="text-[11px] font-bold text-slate-400">Pending</span>
                                 <span className="text-[11px] text-slate-400">₹{a.order?.total?.toFixed(2)}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Column: Ongoing */}
                       <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
                         <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                           <span>Ongoing</span>
                           <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{ongoing.length}</span>
                         </div>
                         <div className="flex flex-col gap-3">
                           {ongoing.map(a => (
                             <div key={a._id} className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-3">
                               <div className="flex justify-between items-start mb-2">
                                 <div>
                                   <div className="font-bold text-white text-sm">#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</div>
                                   <div className="text-[11px] text-slate-400">{a.order?.customer?.name || 'Guest'}</div>
                                 </div>
                                 <div className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 uppercase">{a.order?.deliveryTime}</div>
                               </div>
                               <div className="flex justify-between items-end pt-2 border-t border-slate-700/50">
                                 <span className="text-[11px] font-bold text-blue-400">{a.status.replace('_', ' ')}</span>
                                 <span className="text-[11px] text-slate-400">₹{a.order?.total?.toFixed(2)}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Column: Completed */}
                       <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
                         <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                           <span>Completed</span>
                           <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{completed.length}</span>
                         </div>
                         <div className="flex flex-col gap-3">
                           {completed.map(a => (
                             <div key={a._id} className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-3">
                               <div className="flex justify-between items-start mb-2">
                                 <div>
                                   <div className="font-bold text-white text-sm">#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</div>
                                   <div className="text-[11px] text-slate-400">{a.order?.customer?.name || 'Guest'}</div>
                                 </div>
                                 <div className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 uppercase">{a.order?.deliveryTime}</div>
                               </div>
                               <div className="flex justify-between items-end pt-2 border-t border-slate-700/50">
                                 <span className="text-[11px] font-bold text-emerald-400">Delivered</span>
                                 <div className="text-xs text-white font-bold">
                                   ₹{a.paymentCollected?.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal uppercase">({a.paymentMethod})</span>
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Column: Failed */}
                       <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
                         <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                           <span>Failed</span>
                           <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full">{failed.length}</span>
                         </div>
                         <div className="flex flex-col gap-3">
                           {failed.map(a => (
                             <div key={a._id} className="bg-slate-800/50 border border-rose-500/30 rounded-lg p-3">
                               <div className="flex justify-between items-start mb-2">
                                 <div>
                                   <div className="font-bold text-white text-sm">#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</div>
                                   <div className="text-[11px] text-slate-400">{a.order?.customer?.name || 'Guest'}</div>
                                 </div>
                                 <div className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 uppercase">{a.order?.deliveryTime}</div>
                               </div>
                               <div className="flex justify-between items-end pt-2 border-t border-slate-700/50">
                                 <span className="text-[11px] font-bold text-rose-400">Failed</span>
                                 <span className="text-[11px] text-slate-400">₹{a.order?.total?.toFixed(2)}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               <div className="text-slate-500 py-10 text-center border-t border-slate-800 mt-4">
                 Select a delivery partner to view their daily report.
               </div>
             )}
        </div>
      </div>
    </DashboardShell>
  );
}
