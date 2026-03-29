import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { UserPlus, LogIn, Phone, Mail, User as UserIcon, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthProps {
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

export default function Auth({ onSuccess, initialMode = 'login' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState(''); // Phone or Email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login logic
        let loginEmail = contact;
        // If it's not an email, assume it's a username and find the email
        if (!contact.includes('@')) {
          let usernameDoc;
          try {
            usernameDoc = await getDoc(doc(db, 'usernames', contact));
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `usernames/${contact}`);
          }
          if (!usernameDoc?.exists()) {
            throw new Error('Username not found');
          }
          loginEmail = usernameDoc.data().email;
        }
        await signInWithEmailAndPassword(auth, loginEmail, password);
        onSuccess();
      } else {
        // Signup logic
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        
        // Check if username exists using usernames collection (allowed for unauthenticated)
        let usernameDoc;
        try {
          usernameDoc = await getDoc(doc(db, 'usernames', username));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `usernames/${username}`);
        }
        if (usernameDoc?.exists()) throw new Error('Username already taken');

        // If phone is selected, we create a dummy email for Firebase Auth
        const email = contactType === 'email' ? contact : `${username}@khelowin999.com`;
        
        if (contactType === 'email' && !contact.includes('@')) {
          throw new Error('Please enter a valid email address');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        // Create user document
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name,
            username,
            phone: contactType === 'phone' ? contact : '',
            email: user.email,
            balance: 2300,
            welcomeBonusClaimed: true,
            lastDailyBonusAt: '',
            freeSpins: 1,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        // Create username mapping
        try {
          await setDoc(doc(db, 'usernames', username), {
            email: user.email,
            uid: user.uid
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `usernames/${username}`);
        }
        
        // Sign out after signup as requested by user
        await signOut(auth);
        
        // Switch to login mode and show success
        setIsLogin(true);
        setError('Account created successfully! Please login with your username and password.');
        setContact(username);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl shadow-blue-100 border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-blue-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Join the Game'}
        </h2>
        <p className="text-gray-500 text-sm">
          {isLogin ? 'Login to your account to continue' : 'Create an account and get ৳2300 bonus'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Contact Type Selection */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-2">
              <button
                type="button"
                onClick={() => { setContactType('phone'); setContact(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${contactType === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Phone Number
              </button>
              <button
                type="button"
                onClick={() => { setContactType('email'); setContact(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${contactType === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Email Address
              </button>
            </div>
          </>
        )}

        <div className="relative">
          {isLogin ? (
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          ) : (
            contactType === 'phone' ? (
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            ) : (
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            )
          )}
          <input
            type={!isLogin && contactType === 'phone' ? "tel" : "text"}
            placeholder={isLogin ? "Username or Email" : (contactType === 'phone' ? "Phone Number" : "Email Address")}
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {!isLogin && (
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
              <span>{isLogin ? 'Login Now' : 'Create Account'}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-600 font-bold hover:underline"
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </div>
    </div>
  );
}
