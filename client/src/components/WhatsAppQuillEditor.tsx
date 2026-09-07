import { useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { uploadAdminImage } from "../lib/api";

const API_ORIGIN =
  (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

export const toAbsoluteUploadUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
};

/** Convert Quill HTML to WhatsApp-friendly plain text. */
export const htmlToWhatsAppText = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const imageUrls: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src) imageUrls.push(toAbsoluteUploadUrl(src));
    img.replaceWith(doc.createTextNode(""));
  });

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") return "\n";
    if (tag === "li") {
      const inner = Array.from(el.childNodes).map(walk).join("");
      return `• ${inner.trim()}\n`;
    }

    const inner = Array.from(el.childNodes).map(walk).join("");
    if (["p", "div", "h1", "h2", "h3", "h4", "tr"].includes(tag)) {
      return `${inner.trim()}\n`;
    }
    if (tag === "strong" || tag === "b") return `*${inner}*`;
    if (tag === "em" || tag === "i") return `_${inner}_`;
    return inner;
  };

  let text = Array.from(doc.body.childNodes).map(walk).join("");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  if (imageUrls.length) {
    text = `${text}\n\n📷 Banner / image:\n${imageUrls.join("\n")}`.trim();
  }
  return text;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  token: string | null;
  onError?: (message: string) => void;
};

export default function WhatsAppQuillEditor({ value, onChange, token, onError }: Props) {
  const quillRef = useRef<ReactQuill | null>(null);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"]
        ],
        handlers: {
          image: async () => {
            if (!token) {
              onError?.("Please login again to upload images");
              return;
            }
            const input = document.createElement("input");
            inputTypeFile(input);
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const res = await uploadAdminImage(token, file);
                const url = toAbsoluteUploadUrl(res.url);
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection(true);
                editor.insertEmbed(range?.index || 0, "image", url, "user");
                editor.setSelection((range?.index || 0) + 1, 0);
              } catch (err: any) {
                onError?.(err.message || "Image upload failed");
              }
            };
            input.click();
          }
        }
      }
    }),
    [token, onError]
  );

  return (
    <div className="whatsapp-quill rounded-xl overflow-hidden border border-slate-700 bg-white">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder="Write announcement… Insert banner with the image button."
        className="min-h-[220px] text-slate-900"
      />
      <style>{`
        .whatsapp-quill .ql-toolbar {
          background: #0f172a;
          border: none !important;
          border-bottom: 1px solid #334155 !important;
        }
        .whatsapp-quill .ql-toolbar .ql-stroke { stroke: #cbd5e1; }
        .whatsapp-quill .ql-toolbar .ql-fill { fill: #cbd5e1; }
        .whatsapp-quill .ql-toolbar .ql-picker { color: #cbd5e1; }
        .whatsapp-quill .ql-toolbar button:hover .ql-stroke,
        .whatsapp-quill .ql-toolbar button.ql-active .ql-stroke { stroke: #2dd4bf; }
        .whatsapp-quill .ql-toolbar button:hover .ql-fill,
        .whatsapp-quill .ql-toolbar button.ql-active .ql-fill { fill: #2dd4bf; }
        .whatsapp-quill .ql-container {
          border: none !important;
          min-height: 220px;
          font-size: 14px;
        }
        .whatsapp-quill .ql-editor {
          min-height: 220px;
        }
        .whatsapp-quill .ql-editor img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
}

function inputTypeFile(input: HTMLInputElement) {
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/png,image/jpeg,image/jpg,image/webp");
}
