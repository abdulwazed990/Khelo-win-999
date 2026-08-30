import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Log all requests to help debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// In-memory Server-Side Game Status Registry (Synchronized via API / Firestore)
const serverGameStatuses: Record<string, {
  status: 'ACTIVE' | 'MAINTENANCE' | 'SERVER_ERROR' | 'DISABLED';
  reason?: string;
  updatedAt: string;
  maintenanceTitle?: string;
  maintenanceDescription?: string;
  maintenanceEstimatedTime?: string;
}> = {
  'aviator-jet': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'aviator': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'pokie-super-ace': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'super-ace': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'boxer-king': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'mines': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'roulette': { status: 'ACTIVE', updatedAt: new Date().toISOString() },
  'coinflip': { status: 'ACTIVE', updatedAt: new Date().toISOString() }
};

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Verification API Endpoint (for verification copy records)
app.get("/api/verification/:recordId", (req, res) => {
  const { recordId } = req.params;
  if (!recordId) {
    return res.status(400).json({ error: "Record ID is required" });
  }

  // Sample production verification record format
  res.json({
    id: recordId,
    name: "Mohammad Abdul Wazed",
    fatherName: "Md. Rafiqul Islam",
    motherName: "Sufia Begum",
    date: new Date().toISOString().split('T')[0],
    attestedBy: "Chief Certification Officer",
    designation: "Executive Registrar, Ministry of Foreign Affairs",
    certificates: [
      {
        name: "Academic Verification Certificate",
        attestedBy: "Chief Certification Officer",
        designation: "Executive Registrar",
        image: ""
      }
    ]
  });
});

// In-memory Server-Side Global Win Probability (Fixed default 5%, centrally configured)
let serverGlobalWinProbability: number = 5; // 5%

// Centralized Global Win Probability Endpoints
app.get("/api/settings/game-probability", (req, res) => {
  res.json({
    success: true,
    globalWinProbability: serverGlobalWinProbability,
    updatedAt: new Date().toISOString()
  });
});

app.post("/api/settings/game-probability", (req, res) => {
  const { globalWinProbability, adminEmail } = req.body || {};
  const num = Number(globalWinProbability);

  if (isNaN(num) || num < 1 || num > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid probability value. Must be a number between 1 and 100.'
    });
  }

  const prev = serverGlobalWinProbability;
  serverGlobalWinProbability = Math.round(num * 100) / 100;
  console.log(`[PROBABILITY_UPDATE] Global Win Probability updated from ${prev}% to ${serverGlobalWinProbability}% by ${adminEmail || 'admin'}`);

  res.json({
    success: true,
    globalWinProbability: serverGlobalWinProbability,
    previous: prev,
    updatedAt: new Date().toISOString()
  });
});

// Authoritative Server-Side Game Outcome Calculation Endpoint
app.post("/api/games/calculate-outcome", (req, res) => {
  const { gameKey, stakeAmount } = req.body || {};
  const game = (gameKey || '').toLowerCase().trim();

  // Server-side independent random trial against the centralized Global Win Probability
  const isWin = (Math.random() * 100) < serverGlobalWinProbability;
  const roundId = `RND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  res.json({
    success: true,
    roundId,
    gameKey: game,
    win: isWin,
    globalWinProbability: serverGlobalWinProbability,
    timestamp: new Date().toISOString()
  });
});

// Get All Game Statuses Endpoint
app.get("/api/games/status", (req, res) => {
  res.json({
    success: true,
    statuses: serverGameStatuses,
    timestamp: new Date().toISOString()
  });
});

// Get Single Game Status Endpoint
app.get("/api/games/:gameId/status", (req, res) => {
  const gameKey = (req.params.gameId || '').toLowerCase().trim();
  const gameData = serverGameStatuses[gameKey] || { status: 'ACTIVE', updatedAt: new Date().toISOString() };
  
  res.json({
    success: true,
    gameId: gameKey,
    status: gameData.status,
    isAvailable: gameData.status === 'ACTIVE',
    reason: gameData.reason || '',
    maintenanceTitle: gameData.maintenanceTitle,
    maintenanceDescription: gameData.maintenanceDescription,
    maintenanceEstimatedTime: gameData.maintenanceEstimatedTime,
    updatedAt: gameData.updatedAt
  });
});

// Authoritative Server-Side Game Verification Endpoint
// Used before creating game rounds, placing bets, or validating active sessions
app.all("/api/games/:gameId/verify", (req, res) => {
  const gameKey = (req.params.gameId || '').toLowerCase().trim();
  const gameData = serverGameStatuses[gameKey] || { status: 'ACTIVE', updatedAt: new Date().toISOString() };

  if (gameData.status !== 'ACTIVE') {
    const statusCode = gameData.status === 'SERVER_ERROR' ? 500 : 503;
    return res.status(statusCode).json({
      success: false,
      gameAvailable: false,
      gameId: gameKey,
      status: gameData.status,
      error: `Access Blocked: Game is currently under ${gameData.status}`,
      reason: gameData.reason || 'Server status restriction applied.',
      maintenanceTitle: gameData.maintenanceTitle,
      maintenanceDescription: gameData.maintenanceDescription,
      maintenanceEstimatedTime: gameData.maintenanceEstimatedTime
    });
  }

  res.json({
    success: true,
    gameAvailable: true,
    gameId: gameKey,
    status: 'ACTIVE'
  });
});

// Update Server-Side Game Status (Admin authorized sync)
app.post("/api/games/:gameId/status", (req, res) => {
  const gameKey = (req.params.gameId || '').toLowerCase().trim();
  const { status, reason, maintenanceTitle, maintenanceDescription, maintenanceEstimatedTime } = req.body || {};

  const validStatuses = ['ACTIVE', 'MAINTENANCE', 'SERVER_ERROR', 'DISABLED'];
  const normalizedStatus = String(status || '').toUpperCase();

  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ success: false, error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
  }

  serverGameStatuses[gameKey] = {
    status: normalizedStatus as any,
    reason: reason || '',
    maintenanceTitle,
    maintenanceDescription,
    maintenanceEstimatedTime,
    updatedAt: new Date().toISOString()
  };

  console.log(`[SERVER_STATUS] Game '${gameKey}' status updated to ${normalizedStatus}. Reason: ${reason || 'N/A'}`);

  res.json({
    success: true,
    gameId: gameKey,
    status: normalizedStatus,
    updatedAt: serverGameStatuses[gameKey].updatedAt
  });
});

const distPath = path.join(__dirname, 'dist');

// Check if dist exists
if (!fs.existsSync(distPath)) {
  console.error("Dist directory not found! Please run 'npm run build' first.");
}

// Serve static files
app.use(express.static(distPath));

// SPA Fallback
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Error: index.html not found in dist folder. Please build the app.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
