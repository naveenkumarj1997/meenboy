import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyOrders } from "../../lib/api";
import DashboardShell from "./DashboardShell";

const CUSTOMER_NAV_LINKS = [
  { label: "Orders", href: "/dashboard" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Delivery Status", href: "/dashboard/deliveries" }
];

export default function CustomerDeliveryStatus() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const localTodayStr = `${year}-${month}-${day}`;

  const [selectedDate, setSelectedDate] = useState<string>(localTodayStr);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getMyOrders(token!);
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch delivery status");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => o.deliveryDate === selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "confirmed": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "preparing": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "out_for_delivery": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "delivered": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "cancelled": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-white/70 bg-white/5 border-white/10";
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Delivery Status" description={`Track your deliveries`} navLinks={CUSTOMER_NAV_LINKS}>
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Delivery Status"
      description="Track the status of your upcoming and past deliveries."
      navLinks={CUSTOMER_NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

      <div className="mb-8">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
           <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-800 pb-6">
             <div>
               <h2 className="text-xl font-bold text-white mb-2">Select Delivery Date</h2>
               <p className="text-sm text-slate-400">View your assigned deliveries and their real-time statuses for any day.</p>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <input
                 type="date"
                 className="w-full md:w-auto bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
               />
               {selectedDate !== localTodayStr && (
                 <button 
                   onClick={() => setSelectedDate(localTodayStr)}
                   className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors whitespace-nowrap"
                 >
                   Today
                 </button>
               )}
             </div>
           </div>

           <div>
             <h3 className="text-lg font-bold text-white mb-4">
               Deliveries for {selectedDate === localTodayStr ? "Today" : selectedDate}
             </h3>

             {filteredOrders.length === 0 ? (
               <div className="text-slate-400 py-8 text-center border border-slate-800/50 rounded-lg bg-slate-900/20">
                 No deliveries scheduled for this date.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredOrders.map(order => (
                   <div key={order._id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between">
                     <div>
                       <div className="flex justify-between items-start mb-3">
                         <div className="font-bold text-white text-lg">Order #{String(order._id).slice(-6).toUpperCase()}</div>
                         <div className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300 font-bold uppercase">{order.deliveryTime}</div>
                       </div>
                       
                       <div className="text-slate-400 text-sm mb-4">
                         <div className="font-medium text-white mb-1">Delivery Address</div>
                         <div className="truncate">{order.address?.line1}, {order.address?.line2}</div>
                         <div className="truncate">{order.address?.city}, {order.address?.postalCode}</div>
                         {order.address?.phone && <div className="text-teal-400 mt-1">📞 {order.address.phone}</div>}
                       </div>

                       <div className="text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-4">
                         <div className="font-medium text-slate-300 mb-1">Order Items</div>
                         <div className="text-slate-400 text-xs truncate">
                           {order.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(", ")}
                         </div>
                       </div>
                       
                       {order.deliveryPartner && (
                         <div className="text-sm bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 mb-4">
                           <div className="font-medium text-teal-400 mb-1 text-xs uppercase tracking-wider">Delivery Partner</div>
                           <div className="flex justify-between items-center">
                             <span className="text-white font-bold">{order.deliveryPartner.name}</span>
                             {order.deliveryPartner.phone && (
                               <a href={`tel:${order.deliveryPartner.phone}`} className="text-teal-400 bg-teal-500/20 px-2 py-1 rounded text-xs font-bold hover:bg-teal-500/30 transition-colors">
                                 📞 {order.deliveryPartner.phone}
                               </a>
                             )}
                           </div>
                         </div>
                       )}
                     </div>

                     <div className="flex justify-between items-end pt-4 border-t border-slate-700/50">
                       <div>
                         <div className="text-xs text-slate-500 mb-1">Status</div>
                         <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(order.status)}`}>
                           {order.status.replace("_", " ")}
                         </span>
                       </div>
                       <div className="text-right">
                         <div className="text-xs text-slate-500 mb-1">Total</div>
                         <div className="text-lg font-black text-white">₹{order.total?.toFixed(2)}</div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
