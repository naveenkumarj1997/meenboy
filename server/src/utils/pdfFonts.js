const fs = require("fs");
const path = require("path");

/**
 * Fonts live at server/assets/fonts (not server/src/assets).
 * Laptop Windows used to hide this bug via Nirmala.ttf fallback.
 * Linux / deployed hosts have no Windows fonts, so the bundled TTF must be used.
 */
const CANDIDATE_REGULAR = [
  path.join(__dirname, "../../assets/fonts/HindMadurai-Regular.ttf"),
  path.join(__dirname, "../assets/fonts/HindMadurai-Regular.ttf"),
  path.join(process.cwd(), "assets/fonts/HindMadurai-Regular.ttf"),
  path.join(process.cwd(), "server/assets/fonts/HindMadurai-Regular.ttf"),
  "C:\\Windows\\Fonts\\Nirmala.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansTamil-Regular.ttf",
  "/usr/share/fonts/truetype/lohit-tamil/Lohit-Tamil.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
];

const CANDIDATE_BOLD = [
  path.join(__dirname, "../../assets/fonts/HindMadurai-Bold.ttf"),
  path.join(__dirname, "../assets/fonts/HindMadurai-Bold.ttf"),
  path.join(process.cwd(), "assets/fonts/HindMadurai-Bold.ttf"),
  path.join(process.cwd(), "server/assets/fonts/HindMadurai-Bold.ttf"),
  "C:\\Windows\\Fonts\\NirmalaB.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansTamil-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
];

const firstExisting = (paths) => paths.find((p) => p && fs.existsSync(p)) || null;

const resolvePdfFonts = () => {
  const regular = firstExisting(CANDIDATE_REGULAR);
  const bold = firstExisting(CANDIDATE_BOLD) || regular;
  return { regular, bold };
};

module.exports = { resolvePdfFonts };
