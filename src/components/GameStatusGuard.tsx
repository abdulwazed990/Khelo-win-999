import React, { useState, useEffect } from 'react';
import { subscribeToGameStatus, GameStatusInfo, NormalizedGameStatus } from '../services/gameStatusService';
import GameMaintenanceScreen from './GameMaintenanceScreen';
import { GameItem } from '../types';
import { Loader2 } from 'lucide-react';

interface GameStatusGuardProps {
  gameId: string;
  fallbackTitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}

export default function GameStatusGuard({
  gameId,
  fallbackTitle = 'Casino Game',
  onBack,
  children
}: GameStatusGuardProps) {
  const [statusInfo, setStatusInfo] = useState<GameStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe to authoritative real-time status updates
    const unsubscribe = subscribeToGameStatus(gameId, (info) => {
      setStatusInfo(info);
      setLoading(false);
    });

    // 2. Also query backend API endpoint to ensure server-side synchronization
    const checkServerEndpoint = async () => {
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/verify`, {
          cache: 'no-store'
        });
        if (res.status === 503 || res.status === 500) {
          const errData = await res.json().catch(() => ({}));
          setStatusInfo((prev) => ({
            gameId,
            gameTitle: prev?.gameTitle || fallbackTitle,
            status: errData.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'SERVER_ERROR',
            isAvailable: false,
            reason: errData.reason || 'Server rejected game access.',
            game: prev?.game
          }));
        }
      } catch {
        // Handled gracefully
      }
    };

    checkServerEndpoint();

    return () => {
      unsubscribe();
    };
  }, [gameId, fallbackTitle]);

  if (loading && !statusInfo) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070b14] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <span className="font-chakra font-black text-xs text-slate-300 uppercase tracking-widest">
          Verifying Game Server Status...
        </span>
      </div>
    );
  }

  // If game is blocked by SERVER_ERROR, MAINTENANCE, or DISABLED
  if (statusInfo && !statusInfo.isAvailable) {
    const mockGameItem: GameItem = statusInfo.game || {
      id: gameId,
      title: statusInfo.gameTitle || fallbackTitle,
      category: 'slots',
      status: statusInfo.status,
      statusReason: statusInfo.reason,
      maintenanceTitle: statusInfo.maintenanceTitle,
      maintenanceDescription: statusInfo.maintenanceDescription,
      maintenanceEstimatedTime: statusInfo.maintenanceEstimatedTime,
      maintenanceButtonText: statusInfo.maintenanceButtonText
    };

    return (
      <GameMaintenanceScreen
        game={mockGameItem}
        status={statusInfo.status}
        reason={statusInfo.reason}
        onBackToLobby={onBack}
        onStatusResolved={(newStatus: NormalizedGameStatus) => {
          if (newStatus === 'ACTIVE') {
            setStatusInfo((prev) => prev ? { ...prev, status: 'ACTIVE', isAvailable: true } : null);
          }
        }}
      />
    );
  }

  return <>{children}</>;
}
