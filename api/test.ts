export default function handler(req, res) {
  res.status(200).json({ 
    message: "Vercel Function Test OK",
    time: new Date().toISOString(),
    env: {
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID
    }
  });
}
