import html2canvas from "html2canvas";

export async function captureScreenshot() {
  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      logging: false,
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
    });
    return canvas.toDataURL("image/png").split(",")[1];
  } catch {
    console.warn("MarkUX: screenshot capture failed");
    return null;
  }
}
