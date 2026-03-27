export interface UserData {
  uid: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  balance: number;
  welcomeBonusClaimed?: boolean;
  lastDailyBonusAt?: string;
  lastCaptchaDate?: string;
  captchaInvalidUntil?: string;
  freeSpins?: number;
  lastSpinDate?: string;
  role?: 'admin' | 'user';
}

export interface Transaction {
  id: string;
  uid: string;
  type: 'deposit' | 'withdraw';
  method: 'nagad' | 'bkash' | 'rocket';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  senderNumber?: string;
  transactionId?: string;
  createdAt: string;
}

export interface Bet {
  id: string;
  uid: string;
  gameName: string;
  amount: number;
  profit: number;
  createdAt: string;
}
