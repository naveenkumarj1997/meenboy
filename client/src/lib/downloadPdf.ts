/**
 * Save a Blob as a file. Uses <a download> on every device — Chrome on Android and
 * Safari/Chrome on iOS 13+ honour it for blob: URLs and save to Downloads / Files.
 * The object URL must outlive the click: mobile browsers fetch it asynchronously.
 */
export const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Download a PDF as a file (not opened in the browser's PDF viewer). */
export const triggerPdfDownload = (blob: Blob, filename: string) => {
  const name = /\.pdf$/i.test(filename) ? filename : `${filename}.pdf`;
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  triggerFileDownload(pdfBlob, name);
};
