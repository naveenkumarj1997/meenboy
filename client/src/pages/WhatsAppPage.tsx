import { motion } from "framer-motion";

const WHATSAPP_PHONE_DISPLAY = "+91 9087894319";
const WHATSAPP_PHONE_LINK = "919087894319";
const WHATSAPP_CHAT_URL = `https://wa.me/${WHATSAPP_PHONE_LINK}`;

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.52 3.48A11.86 11.86 0 0012.01 0C5.4 0 .04 5.36.04 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.94 11.94 0 005.8 1.48h.01c6.61 0 11.97-5.36 11.97-11.97 0-3.2-1.25-6.21-3.46-8.41zM12 21.48h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.68.96.98-3.58-.23-.37a9.48 9.48 0 01-1.45-5.05C2.42 6.68 6.7 2.4 12 2.4c2.54 0 4.93.99 6.73 2.79a9.45 9.45 0 012.78 6.72c0 5.3-4.28 9.57-9.51 9.57zm5.22-7.14c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.43s1.02 2.82 1.17 3.01c.14.19 2.01 3.07 4.87 4.31.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.11-.26-.18-.55-.32z" />
  </svg>
);

const WhatsAppPage = () => {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Chat on <span className="text-teal-400">WhatsApp</span>
        </h1>
        <div className="w-24 h-1 bg-teal-500 mx-auto rounded-full mb-6" />
        <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
          If you want urgent orders or discussions, scan the QR code or contact Fish Friendly on
          WhatsApp.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-cyan-900/40 border border-cyan-800 rounded-3xl p-6 sm:p-10 flex flex-col items-center text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-sm font-semibold mb-6">
          <WhatsAppIcon />
          Fish Friendly WhatsApp Business
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl shadow-black/30 mb-6 max-w-sm w-full">
          <img
            src="/whatsapp-qr.png"
            alt="Fish Friendly WhatsApp QR code"
            className="w-full h-auto rounded-xl"
          />
        </div>

        <p className="text-slate-400 text-sm mb-2">WhatsApp number</p>
        <a
          href={WHATSAPP_CHAT_URL}
          target="_blank"
          rel="noreferrer"
          className="text-2xl sm:text-3xl font-bold text-white hover:text-teal-400 transition-colors tracking-wide mb-6"
        >
          {WHATSAPP_PHONE_DISPLAY}
        </a>

        <p className="text-slate-300 max-w-xl mb-8 leading-relaxed">
          Scan this QR code with your phone camera or WhatsApp to start a chat with{" "}
          <span className="text-teal-400 font-semibold">Fish Friendly</span>. Perfect for urgent
          orders, special requests, or quick discussions with our team.
        </p>

        <a
          href={WHATSAPP_CHAT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-[#25D366]/20"
        >
          <WhatsAppIcon />
          Open WhatsApp Chat
        </a>
      </motion.div>
    </div>
  );
};

export default WhatsAppPage;
